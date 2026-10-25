import json
import os
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path

from flask import Blueprint, current_app, g, jsonify, request, send_file
from flask_jwt_extended import jwt_required
from pymongo.errors import PyMongoError

from auth.auth import (
    ROLE_DOCUMENTS,
    _json_object,
    _profile_for_user,
    authenticated_user,
    error_response,
    verification_status,
)
from mongo_store import MongoConfigurationError, log_mongodb_error


admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")
VERIFICATION_STATUSES = {"pending", "approved", "rejected"}
DOCUMENT_LABELS = {
    "id_proof": "Identity proof",
    "address_proof": "Address proof",
    "profile_photo": "Profile photo",
    "registration_proof": "Registration proof",
}


def admin_required(view):
    @wraps(view)
    @jwt_required()
    def wrapped(*args, **kwargs):
        try:
            user = authenticated_user()
        except (MongoConfigurationError, PyMongoError) as error:
            log_mongodb_error(
                current_app.logger,
                "admin authorization lookup",
                error,
            )
            return jsonify(
                success=False,
                message="Database is unavailable.",
            ), 503

        if user is None:
            return error_response("Account not found.", 401)
        if user.get("role") != "admin":
            return error_response("Administrator access is required.", 403)

        g.resqlink_admin = user
        return view(*args, **kwargs)

    return wrapped


def _parse_documents(profile, user):
    raw_documents = (profile or {}).get("documents_json")
    if isinstance(raw_documents, str):
        documents = json.loads(raw_documents)
    else:
        documents = raw_documents
    if documents is None:
        documents = {}
    if not isinstance(documents, dict):
        raise ValueError("Stored verification documents are invalid.")

    user_id = user.get("id", user.get("_id"))
    return [
        {
            "field": field,
            "label": DOCUMENT_LABELS.get(field, field.replace("_", " ").title()),
            "url": (
                f"/api/admin/applications/{user_id}/documents/{field}"
            ),
        }
        for field, stored_name in documents.items()
        if field in DOCUMENT_LABELS and isinstance(stored_name, str) and stored_name
    ]


def _document_path(stored_name):
    if not isinstance(stored_name, str) or not stored_name:
        return None
    upload_root = Path(current_app.config["UPLOAD_FOLDER"]).resolve()
    document_path = (upload_root / "verification" / stored_name).resolve()
    if os.path.commonpath(
        [str(upload_root), str(document_path)]
    ) != str(upload_root):
        return None
    if document_path.suffix.lower() not in {".pdf", ".png", ".jpg", ".jpeg"}:
        return None
    return document_path if document_path.is_file() else None


def _application_record(user):
    profile = _profile_for_user(user)
    profile_data = _json_object(
        (profile or {}).get("profile_json")
        or user.get("profile_data", "{}")
    )
    profile_data.setdefault("phone", user.get("phone"))
    profile_data.setdefault("location", user.get("location"))

    return {
        "id": user.get("id", user.get("_id")),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "role": user.get("role", ""),
        "registered_at": user.get("created_at"),
        "verification_status": verification_status(user, profile),
        "rejection_reason": (
            (profile or {}).get("rejection_reason")
            or user.get("rejection_reason")
        ),
        "reviewer_id": (
            (profile or {}).get("reviewer_id")
            or user.get("reviewer_id")
        ),
        "reviewed_at": (
            (profile or {}).get("reviewed_at")
            or user.get("reviewed_at")
        ),
        "profile_details": {
            key: value
            for key, value in profile_data.items()
            if value not in (None, "", [])
        },
        "documents": _parse_documents(profile, user),
    }


@admin_bp.route("/applications", methods=["GET"])
@admin_required
def list_applications():
    role = request.args.get("role", "all").strip().lower()
    status = request.args.get("status", "all").strip().lower()
    search = request.args.get("q", "").strip()[:100].lower()
    if role != "all" and role not in ROLE_DOCUMENTS:
        return error_response("Choose a valid applicant role.")
    if status != "all" and status not in VERIFICATION_STATUSES:
        return error_response("Choose a valid verification status.")

    try:
        database = current_app.extensions["mongo_store"].database
        applicants = [
            _application_record(user)
            for user in database.users.find({
                "role": {"$in": list(ROLE_DOCUMENTS)}
            }).sort("created_at", -1)
        ]
    except (MongoConfigurationError, PyMongoError) as error:
        log_mongodb_error(
            current_app.logger,
            "load verification applications",
            error,
        )
        return jsonify(
            success=False,
            message="Database is unavailable.",
        ), 503
    except (TypeError, ValueError) as error:
        current_app.logger.error(
            "Invalid stored verification application data (%s).",
            type(error).__name__,
        )
        return jsonify(
            success=False,
            message="Stored application data is invalid and cannot be reviewed.",
        ), 500

    counts = {key: 0 for key in VERIFICATION_STATUSES}
    for application in applicants:
        if application["verification_status"] in counts:
            counts[application["verification_status"]] += 1

    filtered = applicants
    if role != "all":
        filtered = [item for item in filtered if item["role"] == role]
    if status != "all":
        filtered = [
            item for item in filtered
            if item["verification_status"] == status
        ]
    if search:
        filtered = [
            item for item in filtered
            if search in " ".join(
                [
                    item["name"],
                    item["email"],
                    item["role"],
                    json.dumps(item["profile_details"], default=str),
                ]
            ).lower()
        ]

    return jsonify(
        success=True,
        counts=counts,
        total=len(filtered),
        applications=filtered,
    )


@admin_bp.route(
    "/applications/<int:application_id>/decision",
    methods=["POST"],
)
@admin_required
def review_application(application_id):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error_response("Please send a valid review decision.")

    decision = str(data.get("decision", "")).strip().lower()
    if decision not in {"approved", "rejected"}:
        return error_response("Decision must be approved or rejected.")
    rejection_reason = str(data.get("rejection_reason", "")).strip()
    if decision == "rejected" and not rejection_reason:
        return error_response("A rejection reason is required.")
    if len(rejection_reason) > 1000:
        return error_response("Rejection reason must be 1000 characters or fewer.")
    if decision == "approved":
        rejection_reason = None

    store = current_app.extensions["mongo_store"]
    try:
        user = store.database.users.find_one({"id": application_id})
        if user is None or user.get("role") not in ROLE_DOCUMENTS:
            return error_response("Application not found.", 404)
        profile = _profile_for_user(user)
        if (
            verification_status(user, profile) != "pending"
            or user.get("verification_status") in {"approved", "rejected"}
            or (profile or {}).get("verification_status") in {
                "approved",
                "rejected",
            }
        ):
            return error_response(
                "Only pending applications can be reviewed.",
                409,
            )

        now = datetime.now(timezone.utc)
        update_fields = {
            "verification_status": decision,
            "reviewer_id": g.resqlink_admin.get("id"),
            "reviewed_at": now,
            "rejection_reason": rejection_reason,
            "registration_profile.verification_status": decision,
            "registration_profile.reviewer_id": g.resqlink_admin.get("id"),
            "registration_profile.reviewed_at": now,
            "registration_profile.rejection_reason": rejection_reason,
        }
        user_filter = {"id": application_id}
        if user.get("verification_status") == "pending":
            user_filter["verification_status"] = "pending"
        elif user.get("verification_status") is None:
            user_filter["verification_status"] = None
        else:
            return error_response(
                "This application has already been reviewed. Refresh the list.",
                409,
            )

        if decision == "approved":
            raw_documents = (profile or {}).get("documents_json")
            if isinstance(raw_documents, str):
                raw_documents = json.loads(raw_documents or "{}")
            if not isinstance(raw_documents, dict):
                raw_documents = {}
            missing_documents = [
                field
                for field in ROLE_DOCUMENTS[user["role"]]
                if _document_path(raw_documents.get(field)) is None
            ]
            if missing_documents:
                return error_response(
                    "Approval requires all submitted verification documents "
                    "to be present and accessible.",
                    409,
                )

        result = store.database.users.update_one(
            user_filter,
            {"$set": update_fields},
        )
        if result.modified_count != 1:
            return error_response(
                "This application has already been reviewed. Refresh the list.",
                409,
            )

        legacy_profile = store.database.registration_profiles.find_one({
            "user_id": application_id
        })
        if legacy_profile is not None:
            store.database.registration_profiles.update_one(
                {
                    "user_id": application_id,
                    "verification_status": "pending",
                },
                {"$set": {
                    "verification_status": decision,
                    "reviewer_id": g.resqlink_admin.get("id"),
                    "reviewed_at": now,
                    "rejection_reason": rejection_reason,
                }},
            )
    except (MongoConfigurationError, PyMongoError) as error:
        log_mongodb_error(current_app.logger, "save application review", error)
        return jsonify(
            success=False,
            message="Database is unavailable.",
        ), 503

    return jsonify(
        success=True,
        message=(
            "Application approved."
            if decision == "approved"
            else "Application rejected."
        ),
        verification_status=decision,
        rejection_reason=rejection_reason,
        reviewed_at=now.isoformat(),
    )


@admin_bp.route(
    "/applications/<int:application_id>/documents/<field>",
    methods=["GET"],
)
@admin_required
def view_application_document(application_id, field):
    if field not in DOCUMENT_LABELS:
        return error_response("Document not found.", 404)

    try:
        user = current_app.extensions["mongo_store"].database.users.find_one({
            "id": application_id,
            "role": {"$in": list(ROLE_DOCUMENTS)},
        })
        if user is None:
            return error_response("Application not found.", 404)
        profile = _profile_for_user(user)
        documents = _parse_documents(profile, user)
        if not any(document["field"] == field for document in documents):
            return error_response("Document not found.", 404)

        raw_documents = (profile or {}).get("documents_json")
        if isinstance(raw_documents, str):
            raw_documents = json.loads(raw_documents or "{}")
        if not isinstance(raw_documents, dict):
            return error_response("Document not found.", 404)
        stored_name = raw_documents.get(field)

        document_path = _document_path(stored_name)
        if document_path is None:
            return error_response("Document not found.", 404)
        response = send_file(
            document_path,
            mimetype={
                ".pdf": "application/pdf",
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
            }[document_path.suffix.lower()],
            as_attachment=False,
            download_name=f"verification-document{document_path.suffix.lower()}",
            conditional=True,
        )
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Cache-Control"] = "private, no-store"
        return response
    except (MongoConfigurationError, PyMongoError) as error:
        log_mongodb_error(
            current_app.logger,
            "retrieve verification document",
            error,
        )
        return jsonify(
            success=False,
            message="Database is unavailable.",
        ), 503
    except (OSError, ValueError, json.JSONDecodeError) as error:
        current_app.logger.error(
            "Unable to safely open verification document (%s).",
            type(error).__name__,
        )
        return error_response("Document could not be opened.", 404)
