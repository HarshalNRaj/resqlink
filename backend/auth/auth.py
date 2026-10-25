import json
import mimetypes
import os
import re
import uuid
from datetime import datetime, timedelta, timezone

from flask import Blueprint, current_app, jsonify, request, send_file
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from pymongo.errors import DuplicateKeyError, PyMongoError
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

from mongo_store import MongoConfigurationError, log_mongodb_error


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

PUBLIC_ROLES = {"normal_user", "volunteer", "ngo", "blood_bank"}

ROLE_LABELS = {
    "normal_user": "Normal User",
    "volunteer": "Volunteer",
    "ngo": "NGO / Ashram",
    "blood_bank": "Blood Bank",
    "admin": "Admin",
    "user": "Normal User",
}

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}

ROLE_DOCUMENTS = {
    "volunteer": ["id_proof", "address_proof", "profile_photo"],
    "ngo": ["registration_proof", "address_proof", "profile_photo"],
    "blood_bank": ["registration_proof", "address_proof", "profile_photo"],
}

PROFILE_DETAIL_LIMITS = {
    "bio": 500,
    "emergency_contact_name": 100,
    "emergency_contact_phone": 40,
    "city": 100,
    "postal_code": 20,
    "skills": 250,
    "languages": 150,
    "availability": 100,
    "service_latitude": 32,
    "service_longitude": 32,
}


def normalize_role(role):
    return "normal_user" if role == "user" else role


def _json_object(value):
    if isinstance(value, dict):
        return value
    if value is None or value == "":
        return {}
    if isinstance(value, str):
        parsed = json.loads(value)
        if isinstance(parsed, dict):
            return parsed
    raise ValueError("Stored profile details are not a JSON object.")


def _profile_for_user(user):
    embedded_profile = user.get("registration_profile")
    if isinstance(embedded_profile, dict):
        return embedded_profile

    return (
        current_app.extensions["mongo_store"]
        .database.registration_profiles.find_one({"user_id": user["id"]})
    )


def verification_status(user, profile=None):
    if profile is None:
        profile = _profile_for_user(user)
    user_status = user.get("verification_status")
    profile_status = (profile or {}).get("verification_status")
    statuses = {user_status, profile_status}
    status = next(
        (
            candidate
            for candidate in ("rejected", "pending", "approved")
            if candidate in statuses
        ),
        None,
    )
    role = normalize_role(user.get("role"))
    if role in ROLE_DOCUMENTS and status not in {
        "pending",
        "approved",
        "rejected",
    }:
        return "pending"
    if status:
        return status
    return "not_required"


def public_user_data(user):
    role = normalize_role(user.get("role", "normal_user"))
    profile = _profile_for_user(user)

    profile_data = _json_object(
        (profile or {}).get("profile_json")
        or user.get("profile_data", "{}")
    )

    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": role,
        "role_label": ROLE_LABELS.get(role, "User"),
        "verification_status": verification_status(user, profile),
        "rejection_reason": (
            (profile or {}).get("rejection_reason")
            or user.get("rejection_reason")
        ),
        "profile_data": profile_data,
        "profile_photo_url": (
            "/api/auth/profile/photo"
            if user.get("profile_photo_filename")
            else None
        ),
    }


def error_response(message, status_code=400):
    return jsonify(success=False, message=message), status_code


def database_error(action, error):
    log_mongodb_error(current_app.logger, action, error)
    if isinstance(error, MongoConfigurationError):
        message = (
            "MongoDB is not configured. Set MONGODB_URI in backend/.env "
            "and restart the backend."
        )
    else:
        message = (
            "MongoDB is unavailable. Check your Atlas credentials, network "
            "access, and cluster status."
        )
    return error_response(message, 503)


def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


def valid_profile_image(uploaded_file, extension):
    header = uploaded_file.stream.read(12)
    uploaded_file.stream.seek(0)
    if extension in {"jpg", "jpeg"}:
        return header.startswith(b"\xff\xd8\xff")
    if extension == "png":
        return header.startswith(b"\x89PNG\r\n\x1a\n")
    return (
        extension == "webp"
        and header.startswith(b"RIFF")
        and header[8:12] == b"WEBP"
    )


def read_registration_data():
    if request.is_json:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return None, None
        return data, {}

    return request.form.to_dict(), request.files


def save_registration_documents(role, uploaded_files):
    required_fields = ROLE_DOCUMENTS.get(role, [])
    if not required_fields:
        return {}, None

    upload_folder = os.path.join(
        current_app.config["UPLOAD_FOLDER"],
        "verification",
    )
    os.makedirs(upload_folder, exist_ok=True)
    validated_uploads = []

    for field in required_fields:
        uploaded_file = uploaded_files.get(field)
        if uploaded_file is None or not uploaded_file.filename:
            return None, (
                f"Please upload the required document: "
                f"{field.replace('_', ' ')}."
            )

        original_name = secure_filename(uploaded_file.filename)
        if not original_name or not allowed_file(original_name):
            return None, (
                f"Invalid file for {field.replace('_', ' ')}. "
                "Upload a PDF, PNG, JPG, or JPEG file."
            )

        size = uploaded_file.stream.seek(0, os.SEEK_END)
        uploaded_file.stream.seek(0)
        if size <= 0 or size > 5 * 1024 * 1024:
            return None, (
                f"{field.replace('_', ' ').title()} must be non-empty "
                "and no larger than 5 MB."
            )

        extension = original_name.rsplit(".", 1)[1].lower()
        validated_uploads.append((field, uploaded_file, extension))

    saved_documents = {}
    for field, uploaded_file, extension in validated_uploads:
        stored_name = f"{uuid.uuid4().hex}.{extension}"
        destination = os.path.join(upload_folder, stored_name)
        uploaded_file.save(destination)
        saved_documents[field] = stored_name

    return saved_documents, None


def _mongo_database():
    store = current_app.extensions["mongo_store"]
    store.ensure_ready()
    return store.database


def authenticated_user():
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except (TypeError, ValueError):
        return None
    database = _mongo_database()
    return (
        database.users.find_one({"id": user_id})
        or database.users.find_one({"_id": user_id})
    )


@auth_bp.route("/register", methods=["POST"])
def register():
    data, uploaded_files = read_registration_data()
    if data is None:
        return error_response("Please send valid registration data.")

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")
    role = normalize_role(str(data.get("role", "normal_user")).strip())

    if not name:
        return error_response("Name is required.")
    if len(name) > 100:
        return error_response("Name must be 100 characters or fewer.")
    if not email or len(email) > 255:
        return error_response("Please enter a valid email address.")
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return error_response("Please enter a valid email address.")
    if not isinstance(password, str) or len(password) < 8:
        return error_response("Password must contain at least 8 characters.")
    if role not in PUBLIC_ROLES:
        return error_response(
            "This role cannot register through public signup.",
            403,
        )

    raw_profile = data.get("profile_data", "{}")
    try:
        if isinstance(raw_profile, str):
            profile_data = json.loads(raw_profile or "{}")
        elif isinstance(raw_profile, dict):
            profile_data = raw_profile
        else:
            return error_response("Profile details must be valid JSON.")
    except (TypeError, json.JSONDecodeError):
        return error_response("Profile details must be valid JSON.")

    if not isinstance(profile_data, dict):
        return error_response("Profile details must be a JSON object.")

    try:
        database = _mongo_database()
        if database.users.find_one({"normalized_email": email}):
            return error_response(
                "An account with this email already exists. Please log in.",
                409,
            )

        saved_documents, document_error = save_registration_documents(
            role,
            uploaded_files,
        )
        if document_error:
            return error_response(document_error)

        user_id = current_app.extensions["mongo_store"].next_id("users")
        status = "pending" if role in ROLE_DOCUMENTS else "not_required"
        serialized_profile = json.dumps(profile_data)
        user = {
            "_id": user_id,
            "id": user_id,
            "name": name,
            "email": email,
            "normalized_email": email,
            "password_hash": generate_password_hash(password),
            "role": role,
            "created_at": datetime.now(timezone.utc),
            "phone": str(data.get("phone", "")).strip() or None,
            "location": str(data.get("location", "")).strip() or None,
            "profile_data": serialized_profile,
            "verification_status": status,
            "rejection_reason": None,
            "registration_profile": {
                "profile_json": serialized_profile,
                "documents_json": json.dumps(saved_documents),
                "verification_status": status,
                "rejection_reason": None,
            },
        }
        database.users.insert_one(user)
    except DuplicateKeyError:
        return error_response(
            "An account with this email already exists. Please log in.",
            409,
        )
    except (MongoConfigurationError, PyMongoError) as error:
        return database_error("Registration", error)

    actual_role = normalize_role(user["role"])
    access_token = create_access_token(
        identity=str(user["id"]),
        additional_claims={"role": actual_role},
        expires_delta=timedelta(hours=1),
    )
    return jsonify(
        success=True,
        message="Account created successfully.",
        access_token=access_token,
        user=public_user_data(user),
    ), 201


@auth_bp.route("/resubmit", methods=["POST"])
@jwt_required()
def resubmit_verification():
    data, uploaded_files = read_registration_data()
    if data is None:
        return error_response("Please send valid verification data.")

    try:
        user = authenticated_user()
        if user is None:
            return error_response("Account not found.", 404)

        role = normalize_role(user.get("role", "normal_user"))
        if role not in ROLE_DOCUMENTS:
            return error_response(
                "This account does not require document verification.",
                403,
            )
        if verification_status(user) != "rejected":
            return error_response(
                "Only rejected applications can be resubmitted.",
                409,
            )

        saved_documents, document_error = save_registration_documents(
            role,
            uploaded_files,
        )
        if document_error:
            return error_response(document_error)

        now = datetime.now(timezone.utc)
        serialized_documents = json.dumps(saved_documents)
        database = _mongo_database()
        resubmit_filter = {
            "id": user["id"],
            "verification_status": user.get("verification_status"),
        }
        update_result = database.users.update_one(
            resubmit_filter,
            {"$set": {
                    "verification_status": "pending",
                    "rejection_reason": None,
                    "registration_profile.documents_json": serialized_documents,
                    "registration_profile.verification_status": "pending",
                    "registration_profile.rejection_reason": None,
                    "registration_profile.submitted_at": now,
                }},
        )
        if update_result.modified_count != 1:
            return error_response(
                "Your application status changed. Refresh and try again.",
                409,
            )
        legacy_profiles = database.registration_profiles
        if legacy_profiles.find_one({"user_id": user["id"]}):
            legacy_profiles.update_one(
                {
                    "user_id": user["id"],
                    "verification_status": "rejected",
                },
                {
                    "$set": {
                        "documents_json": serialized_documents,
                        "verification_status": "pending",
                        "rejection_reason": None,
                        "submitted_at": now,
                    }
                },
            )
        updated_user = database.users.find_one({"id": user["id"]}) or user
    except (MongoConfigurationError, PyMongoError) as error:
        return database_error("Verification resubmission", error)

    return jsonify(
        success=True,
        message="Your updated documents have been submitted for review.",
        user=public_user_data(updated_user),
    ), 200


@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    data, uploaded_files = read_registration_data()
    if data is None:
        return error_response("Please send valid profile data.")

    name = str(data.get("name", "")).strip()
    phone = str(data.get("phone", "")).strip()
    location = str(data.get("location", "")).strip()
    if not name or len(name) > 100:
        return error_response("Name is required and must be 100 characters or fewer.")
    if len(phone) > 40:
        return error_response("Phone number must be 40 characters or fewer.")
    if len(location) > 150:
        return error_response("Location must be 150 characters or fewer.")

    raw_profile = data.get("profile_data", "{}")
    try:
        if isinstance(raw_profile, str):
            profile_data = json.loads(raw_profile or "{}")
        elif isinstance(raw_profile, dict):
            profile_data = raw_profile
        else:
            return error_response("Additional profile details must be valid JSON.")
    except (TypeError, json.JSONDecodeError):
        return error_response("Additional profile details must be valid JSON.")
    if not isinstance(profile_data, dict):
        return error_response("Additional profile details must be a JSON object.")

    extra_profile = {}
    for key, max_length in PROFILE_DETAIL_LIMITS.items():
        value = profile_data.get(key, "")
        if not isinstance(value, str) or len(value.strip()) > max_length:
            return error_response(
                f"{key.replace('_', ' ').capitalize()} must be "
                f"{max_length} characters or fewer."
            )
        extra_profile[key] = value.strip()

    try:
        user = authenticated_user()
        if user is None:
            return error_response("Account not found.", 404)
        database = _mongo_database()
    except (MongoConfigurationError, PyMongoError) as error:
        return database_error("Profile lookup", error)

    existing_profile_data = _json_object(user.get("profile_data", "{}"))
    share_directory_location = profile_data.get(
        "directory_location_shared",
        existing_profile_data.get("directory_location_shared", False),
    )
    role = normalize_role(user.get("role", "normal_user"))
    if not isinstance(share_directory_location, bool):
        return error_response("Directory location sharing must be enabled or disabled.")
    if share_directory_location and role not in {"ngo", "blood_bank"}:
        return error_response(
            "Only organizations and blood banks can publish a service-area location.",
            403,
        )

    service_latitude = None
    service_longitude = None
    if share_directory_location:
        try:
            service_latitude = float(profile_data.get("service_latitude"))
            service_longitude = float(profile_data.get("service_longitude"))
        except (TypeError, ValueError):
            return error_response(
                "Set a valid service-area location before sharing it."
            )
        if (
            not -90 <= service_latitude <= 90
            or not -180 <= service_longitude <= 180
        ):
            return error_response("Service-area coordinates are outside valid ranges.")

    photo = uploaded_files.get("profile_photo")
    photo_filename = None
    photo_destination = None
    if photo is not None and photo.filename:
        original_name = secure_filename(photo.filename)
        extension = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""
        if extension not in {"jpg", "jpeg", "png", "webp"}:
            return error_response("Profile photo must be a JPG, PNG, or WebP image.")
        size = photo.stream.seek(0, os.SEEK_END)
        photo.stream.seek(0)
        if size <= 0 or size > 3 * 1024 * 1024:
            return error_response("Profile photo must be non-empty and no larger than 3 MB.")
        if not valid_profile_image(photo, extension):
            return error_response("The uploaded profile photo is not a valid image.")
        photo_filename = f"{uuid.uuid4().hex}.{extension}"
        photo_directory = os.path.join(
            current_app.config["UPLOAD_FOLDER"],
            "profile_photos",
        )
        os.makedirs(photo_directory, exist_ok=True)
        photo_destination = os.path.join(photo_directory, photo_filename)
        photo.save(photo_destination)

    try:
        existing_profile = _json_object(user.get("profile_data", "{}"))
        existing_profile.update(extra_profile)
        existing_profile["directory_location_shared"] = share_directory_location
        if share_directory_location:
            existing_profile["service_latitude"] = (
                f"{round(service_latitude, 2):.2f}"
            )
            existing_profile["service_longitude"] = (
                f"{round(service_longitude, 2):.2f}"
            )
        else:
            existing_profile.pop("service_latitude", None)
            existing_profile.pop("service_longitude", None)
        serialized_profile = json.dumps(existing_profile)
        updates = {
            "name": name,
            "phone": phone or None,
            "location": location or None,
            "profile_data": serialized_profile,
            "registration_profile.profile_json": serialized_profile,
            "profile_updated_at": datetime.now(timezone.utc),
        }
        if photo_filename:
            updates["profile_photo_filename"] = photo_filename

        result = database.users.update_one(
            {"id": user["id"]},
            {"$set": updates},
        )
        if result.matched_count != 1:
            return error_response("Your profile could not be updated. Please retry.", 500)

        legacy_profiles = database.registration_profiles
        if legacy_profiles.find_one({"user_id": user["id"]}):
            legacy_profiles.update_one(
                {"user_id": user["id"]},
                {"$set": {"profile_json": serialized_profile}},
            )
        updated_user = database.users.find_one({"id": user["id"]})
    except (MongoConfigurationError, PyMongoError) as error:
        return database_error("Profile update", error)
    except (TypeError, ValueError):
        return error_response("Stored profile details could not be updated.", 500)

    return jsonify(
        success=True,
        message="Profile updated successfully.",
        user=public_user_data(updated_user),
    ), 200


@auth_bp.route("/profile/photo", methods=["GET"])
@jwt_required()
def get_profile_photo():
    try:
        user = authenticated_user()
        if user is None:
            return error_response("Account not found.", 404)
        filename = user.get("profile_photo_filename")
        if not filename or os.path.basename(filename) != filename:
            return error_response("Profile photo not found.", 404)
        photo_path = os.path.join(
            current_app.config["UPLOAD_FOLDER"],
            "profile_photos",
            filename,
        )
        if not os.path.isfile(photo_path):
            return error_response("Profile photo not found.", 404)
        mime_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        response = send_file(photo_path, mimetype=mime_type, max_age=0)
        response.headers["Cache-Control"] = "private, no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response
    except (MongoConfigurationError, PyMongoError) as error:
        return database_error("Profile photo lookup", error)


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error_response("Please send valid login data.")

    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")
    selected_role = data.get("role")
    if not email or not isinstance(password, str) or not password:
        return error_response("Email and password are required.")

    try:
        database = _mongo_database()
        user = database.users.find_one({"normalized_email": email})
        if user is None:
            user = database.users.find_one({"email": email})

        if not user or not check_password_hash(
            user.get("password_hash", ""),
            password,
        ):
            return error_response("Incorrect email or password.", 401)

        actual_role = normalize_role(user.get("role", "normal_user"))
        if selected_role:
            selected_role = normalize_role(str(selected_role).strip())
            if selected_role != actual_role:
                return error_response(
                    "This account is registered under a different role.",
                    403,
                )
    except (MongoConfigurationError, PyMongoError) as error:
        return database_error("Login", error)

    access_token = create_access_token(
        identity=str(user["id"]),
        additional_claims={"role": actual_role},
        expires_delta=timedelta(hours=1),
    )
    try:
        user_data = public_user_data(user)
    except (MongoConfigurationError, PyMongoError) as error:
        return database_error("Loading the registration profile during login", error)
    return jsonify(
        success=True,
        message="Login successful.",
        access_token=access_token,
        user=user_data,
    ), 200
