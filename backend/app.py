import os
import re
import json
import math
import mimetypes
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import click
from dotenv import dotenv_values, load_dotenv
from flask import Flask, current_app, jsonify, request, send_file
from flask_cors import CORS
from flask_jwt_extended import JWTManager, verify_jwt_in_request
from pymongo.errors import PyMongoError
from werkzeug.security import generate_password_hash
from werkzeug.utils import secure_filename

from auth.admin import admin_bp
from auth.auth import (
    ROLE_DOCUMENTS,
    auth_bp,
    authenticated_user,
    normalize_role,
    valid_profile_image,
    verification_status,
)
from mongo_store import (
    MongoConfigurationError,
    MongoStore,
    log_mongodb_error,
    serialize_document,
)


BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"

ALLOWED_CATEGORIES = {
    "Food",
    "Clothes",
    "Books",
    "Essentials",
    "Other",
}

def _profile_data(user):
    raw_profile = user.get("profile_data", "{}")
    try:
        profile = json.loads(raw_profile) if isinstance(raw_profile, str) else raw_profile
    except json.JSONDecodeError:
        return {}
    return profile if isinstance(profile, dict) else {}


def _valid_coordinate(value, lower, upper):
    try:
        coordinate = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(coordinate) or not lower <= coordinate <= upper:
        return None
    return coordinate


def _resolve_setting(name, env_file_values, default=None):
    process_value = os.environ.get(name)
    if process_value and process_value.strip():
        return process_value, "environment"

    file_value = env_file_values.get(name)
    if isinstance(file_value, str) and file_value.strip():
        return file_value, "backend/.env"

    return default, "default"


def create_app(test_config=None):
    load_dotenv(ENV_FILE)
    env_file_values = dotenv_values(ENV_FILE)
    mongodb_uri, mongodb_uri_source = _resolve_setting(
        "MONGODB_URI",
        env_file_values,
    )
    mongodb_database, mongodb_database_source = _resolve_setting(
        "MONGODB_DATABASE",
        env_file_values,
        "resqlink",
    )
    jwt_secret, _ = _resolve_setting(
        "JWT_SECRET_KEY",
        env_file_values,
        "dev-only-change-this-secret-before-deployment",
    )

    app = Flask(__name__)
    CORS(app)
    app.config.update(
        JWT_SECRET_KEY=jwt_secret,
        JWT_ACCESS_TOKEN_EXPIRES=3600,
        MAX_CONTENT_LENGTH=16 * 1024 * 1024,
        UPLOAD_FOLDER=BASE_DIR / "uploads",
        MONGODB_URI=mongodb_uri,
        MONGODB_DATABASE=mongodb_database,
    )
    if test_config:
        app.config.update(test_config)

    app.logger.info(
        "Application configuration loaded "
        "(pid=%s, env_file_present=%s, mongodb_uri_configured=%s, "
        "mongodb_uri_source=%s, mongodb_database_source=%s).",
        os.getpid(),
        ENV_FILE.is_file(),
        bool(app.config["MONGODB_URI"]),
        mongodb_uri_source,
        mongodb_database_source,
    )

    app.config["UPLOAD_FOLDER"].mkdir(parents=True, exist_ok=True)
    app.extensions["mongo_store"] = MongoStore(
        app.config["MONGODB_URI"],
        app.config["MONGODB_DATABASE"],
    )

    JWTManager(app)
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)

    @app.cli.command("create-admin")
    def create_admin():
        """Create a dedicated administrator account from an interactive prompt."""
        name = click.prompt("Administrator name").strip()
        email = click.prompt("Administrator email").strip().lower()
        if (
            not name
            or len(name) > 100
            or len(email) > 255
            or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email)
        ):
            raise click.ClickException("Enter a valid name and email address.")

        password = click.prompt(
            "Administrator password",
            hide_input=True,
            confirmation_prompt=True,
        )
        if len(password) < 12:
            raise click.ClickException(
                "Administrator password must contain at least 12 characters."
            )

        store = app.extensions["mongo_store"]
        try:
            store.ensure_ready()
            existing_email = store.database.users.find_one({
                "$or": [
                    {"normalized_email": email},
                    {
                        "email": {
                            "$regex": f"^{re.escape(email)}$",
                            "$options": "i",
                        }
                    },
                ]
            })
            if existing_email:
                raise click.ClickException(
                    "That email already belongs to an account. "
                    "Choose a new, dedicated administrator email."
                )

            user_id = store.next_id("users")
            store.database.users.insert_one({
                "_id": user_id,
                "id": user_id,
                "name": name,
                "email": email,
                "normalized_email": email,
                "password_hash": generate_password_hash(password),
                "role": "admin",
                "created_at": datetime.now(timezone.utc),
                "phone": None,
                "location": None,
                "profile_data": "{}",
                "verification_status": "not_required",
            })
        except click.ClickException:
            raise
        except (MongoConfigurationError, PyMongoError) as error:
            log_mongodb_error(app.logger, "create administrator account", error)
            raise click.ClickException(
                "MongoDB is unavailable. Verify Atlas configuration and retry."
            ) from None

        click.echo("Administrator account created.")

    @app.route("/")
    def home():
        return jsonify({
            "success": True,
            "message": "Welcome to ResQlink API!",
            "status": "Backend is running",
        })

    @app.route("/api/health")
    def health():
        store = app.extensions["mongo_store"]
        try:
            store.ping()
        except (MongoConfigurationError, PyMongoError) as error:
            log_mongodb_error(app.logger, "health check", error)
            return jsonify({
                "success": False,
                "message": "MongoDB is not configured or is unavailable.",
                "database": "unavailable",
            }), 503

        return jsonify({
            "success": True,
            "message": "ResQlink backend and MongoDB are healthy.",
            "database": "connected",
        })

    @app.route("/api/resources", methods=["GET"])
    def get_resources():
        category = request.args.get("category", "").strip()
        store = app.extensions["mongo_store"]

        try:
            store.ensure_ready()
            query: dict[str, Any] = {"status": "Available"}
            if category:
                query["category"] = {
                    "$regex": f"^{re.escape(category)}$",
                    "$options": "i",
                }
            resources = [
                serialize_document(resource)
                for resource in store.database.resources.find(query).sort(
                    "created_at", -1
                )
            ]
        except (MongoConfigurationError, PyMongoError) as error:
            return database_unavailable(error, "load resources")

        return jsonify({
            "success": True,
            "count": len(resources),
            "resources": resources,
        })

    @app.route("/api/resources/<int:resource_id>/photo")
    def get_resource_photo(resource_id):
        store = app.extensions["mongo_store"]
        try:
            store.ensure_ready()
            resource = store.database.resources.find_one(
                {"_id": resource_id, "status": "Available"},
            )
            filename = (resource or {}).get("photo_filename")
            if not filename or Path(filename).name != filename:
                return jsonify(success=False, message="Resource photo not found."), 404
            photo_path = (
                Path(app.config["UPLOAD_FOLDER"]) / "resource_photos" / filename
            )
            if not photo_path.is_file():
                return jsonify(success=False, message="Resource photo not found."), 404
            mime_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
            response = send_file(photo_path, mimetype=mime_type, max_age=0)
            response.headers["Cache-Control"] = "public, max-age=300"
            response.headers["X-Content-Type-Options"] = "nosniff"
            return response
        except (MongoConfigurationError, PyMongoError) as error:
            return database_unavailable(error, "load resource photo")

    @app.route("/api/nearby", methods=["GET"])
    def get_nearby_organizations():
        search = request.args.get("q", "").strip().casefold()[:100]
        role_filter = request.args.get("type", "").strip().lower()
        if role_filter and role_filter not in {"ngo", "blood_bank"}:
            return jsonify({
                "success": False,
                "message": "Type must be ngo or blood_bank.",
            }), 400

        latitude_value = request.args.get("lat")
        longitude_value = request.args.get("lng")
        radius_value = request.args.get("radius_km", "50")
        if bool(latitude_value) != bool(longitude_value):
            return jsonify({
                "success": False,
                "message": "Provide both latitude and longitude.",
            }), 400

        center = None
        if latitude_value and longitude_value:
            latitude = _valid_coordinate(latitude_value, -90, 90)
            longitude = _valid_coordinate(longitude_value, -180, 180)
            try:
                radius = float(radius_value)
            except ValueError:
                radius = None
            if (
                latitude is None
                or longitude is None
                or radius is None
                or not math.isfinite(radius)
                or not 1 <= radius <= 500
            ):
                return jsonify({
                    "success": False,
                    "message": (
                        "Enter valid coordinates and a radius between 1 and "
                        "500 kilometres."
                    ),
                }), 400
            center = (latitude, longitude)

        store = app.extensions["mongo_store"]
        try:
            store.ensure_ready()
            organizations = []
            for account in store.database.users.find({
                "role": {"$in": ["ngo", "blood_bank"]},
            }).limit(500):
                role = normalize_role(account.get("role", ""))
                if role_filter and role != role_filter:
                    continue
                if verification_status(account) != "approved":
                    continue

                profile = _profile_data(account)
                organization_name = (
                    profile.get("organisation_name")
                    or profile.get("facility_name")
                    or account.get("name")
                    or "Community organization"
                )
                city = str(profile.get("city") or "").strip()
                service_area = str(profile.get("service_area") or "").strip()
                searchable = " ".join((
                    str(organization_name),
                    city,
                    service_area,
                    role,
                )).casefold()
                if search and search not in searchable:
                    continue

                item = {
                    "id": account.get("id"),
                    "name": str(organization_name)[:150],
                    "role": role,
                    "city": city[:100],
                    "service_area": service_area[:150],
                    "verified": True,
                    "location_shared": (
                        profile.get("directory_location_shared") is True
                    ),
                }
                if item["location_shared"]:
                    org_lat = _valid_coordinate(
                        profile.get("service_latitude"), -90, 90
                    )
                    org_lng = _valid_coordinate(
                        profile.get("service_longitude"), -180, 180
                    )
                    if org_lat is not None and org_lng is not None:
                        item["latitude"] = org_lat
                        item["longitude"] = org_lng
                        if center:
                            lat1, lng1 = map(math.radians, center)
                            lat2, lng2 = math.radians(org_lat), math.radians(org_lng)
                            delta_lat, delta_lng = lat2 - lat1, lng2 - lng1
                            haversine = (
                                math.sin(delta_lat / 2) ** 2
                                + math.cos(lat1) * math.cos(lat2)
                                * math.sin(delta_lng / 2) ** 2
                            )
                            distance = 6371 * 2 * math.atan2(
                                math.sqrt(haversine),
                                math.sqrt(1 - haversine),
                            )
                            if distance > radius:
                                continue
                            item["distance_km"] = round(distance, 1)
                elif center:
                    continue

                organizations.append(item)

            if center:
                organizations.sort(
                    key=lambda item: item.get("distance_km", float("inf"))
                )
            else:
                organizations.sort(key=lambda item: item["name"].casefold())
        except (MongoConfigurationError, PyMongoError) as error:
            return database_unavailable(error, "load nearby organizations")

        return jsonify({
            "success": True,
            "count": len(organizations),
            "organizations": organizations,
            "location_based": center is not None,
        })

    @app.route("/api/resources", methods=["POST"])
    def create_resource():
        data = request.get_json(silent=True) if request.is_json else request.form.to_dict()
        uploaded_photo = request.files.get("photo")

        if not isinstance(data, dict):
            return jsonify({
                "success": False,
                "message": "Please send valid JSON data.",
            }), 400

        required_fields = [
            "title", "category", "description", "location", "quantity"
        ]
        for field in required_fields:
            value = data.get(field)
            if not isinstance(value, str) or not value.strip():
                return jsonify({
                    "success": False,
                    "message": f"{field} is required.",
                }), 400

        category = data["category"].strip().title()
        if category not in ALLOWED_CATEGORIES:
            return jsonify({
                "success": False,
                "message": "Choose Food, Clothes, Books, Essentials, or Other.",
            }), 400

        verify_jwt_in_request()
        try:
            user = authenticated_user()
        except (MongoConfigurationError, PyMongoError) as error:
            return database_unavailable(error, "authorize resource publication")

        if user is None:
            return jsonify({
                "success": False,
                "message": "Account not found. Please sign in again.",
            }), 401
        role = normalize_role(user.get("role", "normal_user"))
        if role in ROLE_DOCUMENTS and verification_status(user) != "approved":
            return jsonify({
                "success": False,
                "message": (
                    "Your account must be approved before publishing resources."
                ),
            }), 403
        if role not in ROLE_DOCUMENTS and role not in {"normal_user", "admin"}:
            return jsonify({
                "success": False,
                "message": "This account cannot publish resources.",
            }), 403

        photo_filename = None
        if uploaded_photo is not None and uploaded_photo.filename:
            safe_name = secure_filename(uploaded_photo.filename)
            extension = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else ""
            if extension not in {"jpg", "jpeg", "png", "webp"}:
                return jsonify({
                    "success": False,
                    "message": "Resource photo must be JPG, PNG, or WebP.",
                }), 400
            photo_size = uploaded_photo.stream.seek(0, os.SEEK_END)
            uploaded_photo.stream.seek(0)
            if photo_size <= 0 or photo_size > 5 * 1024 * 1024:
                return jsonify({
                    "success": False,
                    "message": "Resource photo must be non-empty and no larger than 5 MB.",
                }), 400
            if not valid_profile_image(uploaded_photo, extension):
                return jsonify({
                    "success": False,
                    "message": "The uploaded resource photo is not a valid image.",
                }), 400
            photo_filename = f"{uuid.uuid4().hex}.{extension}"

        store = app.extensions["mongo_store"]
        photo_path = None
        try:
            store.ensure_ready()
            resource_id = store.next_id("resources")
            if photo_filename:
                photo_directory = Path(app.config["UPLOAD_FOLDER"]) / "resource_photos"
                photo_directory.mkdir(parents=True, exist_ok=True)
                photo_path = photo_directory / photo_filename
                uploaded_photo.save(photo_path)
            new_resource = {
                "_id": resource_id,
                "id": resource_id,
                "title": data["title"].strip(),
                "category": category,
                "description": data["description"].strip(),
                "location": data["location"].strip(),
                "quantity": data["quantity"].strip(),
                "status": "Available",
                "created_at": datetime.now(timezone.utc),
                "owner_id": user["id"],
                "owner_role": role,
            }
            if photo_filename:
                new_resource["photo_filename"] = photo_filename
                new_resource["photo_url"] = f"/api/resources/{resource_id}/photo"
            store.database.resources.insert_one(new_resource)
        except (MongoConfigurationError, PyMongoError) as error:
            if photo_path and photo_path.exists():
                photo_path.unlink()
            return database_unavailable(error, "create resource")

        return jsonify({
            "success": True,
            "message": "Resource added successfully!",
            "resource": serialize_document(new_resource),
        }), 201

    @app.route("/api/requests", methods=["POST"])
    def create_resource_request():
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({
                "success": False,
                "message": "Please send valid JSON data.",
            }), 400

        verify_jwt_in_request()
        try:
            user = authenticated_user()
        except (MongoConfigurationError, PyMongoError) as error:
            return database_unavailable(error, "authorize resource request")

        if user is None:
            return jsonify({
                "success": False,
                "message": "Account not found. Please sign in again.",
            }), 401

        required_fields = [
            "resource_id", "requester_name", "contact", "message"
        ]
        for field in required_fields:
            value = data.get(field)
            if not isinstance(value, str) or not value.strip():
                return jsonify({
                    "success": False,
                    "message": f"{field.replace('_', ' ').title()} is required.",
                }), 400
        limits = {
            "requester_name": 100,
            "contact": 150,
            "message": 2000,
        }
        for field, limit in limits.items():
            if len(data[field].strip()) > limit:
                return jsonify({
                    "success": False,
                    "message": (
                        f"{field.replace('_', ' ').title()} must be "
                        f"{limit} characters or fewer."
                    ),
                }), 400

        fulfillment_method = str(data.get("fulfillment_method", "pickup")).strip().lower()
        if fulfillment_method not in {"pickup", "delivery"}:
            return jsonify({
                "success": False,
                "message": "Choose pickup or delivery.",
            }), 400
        delivery_address = str(data.get("delivery_address", "")).strip()
        if fulfillment_method == "delivery" and not delivery_address:
            return jsonify({
                "success": False,
                "message": "A delivery destination is required for volunteer delivery.",
            }), 400
        if len(delivery_address) > 300:
            return jsonify({
                "success": False,
                "message": "Delivery destination must be 300 characters or fewer.",
            }), 400

        try:
            resource_id = int(data["resource_id"])
        except (ValueError, TypeError):
            return jsonify({
                "success": False,
                "message": "Resource ID must be a valid number.",
            }), 400

        if resource_id < 1:
            return jsonify({
                "success": False,
                "message": "Resource ID must be a positive number.",
            }), 400

        store = app.extensions["mongo_store"]
        try:
            store.ensure_ready()
            resource = store.database.resources.find_one({
                "_id": resource_id,
                "status": "Available",
            })
            if resource is None:
                return jsonify({
                    "success": False,
                    "message": "This resource is unavailable or does not exist.",
                }), 404
            if resource.get("owner_id") == user["id"]:
                return jsonify({
                    "success": False,
                    "message": "You cannot request a resource you published.",
                }), 409

            request_id = store.next_id("resource_requests")
            provider = (
                store.database.users.find_one({"id": resource.get("owner_id")})
                if resource.get("owner_id") is not None
                else None
            )
            requested_at = datetime.now(timezone.utc)
            new_request = {
                "_id": request_id,
                "id": request_id,
                "resource_id": resource_id,
                "resource_title": resource["title"],
                "resource_location": resource.get("location", ""),
                "requester_name": data["requester_name"].strip(),
                "contact": data["contact"].strip(),
                "message": data["message"].strip(),
                "fulfillment_method": fulfillment_method,
                "delivery_address": delivery_address if fulfillment_method == "delivery" else None,
                "status": "pending",
                "created_at": requested_at,
                "requester_id": user["id"],
                "provider_id": resource.get("owner_id"),
                "provider_role": resource.get("owner_role"),
                "provider_name": (provider or {}).get("name"),
                "status_history": [{
                    "status": "requested",
                    "actor_id": user["id"],
                    "at": requested_at.isoformat(),
                }],
            }
            store.database.resource_requests.insert_one(new_request)
        except (MongoConfigurationError, PyMongoError) as error:
            return database_unavailable(error, "submit resource request")

        return jsonify({
            "success": True,
            "message": "Your resource request has been submitted!",
            "resource_request": serialize_document(new_request),
        }), 201

    @app.route("/api/requests", methods=["GET"])
    def get_resource_requests():
        resource_id = request.args.get("resource_id", "").strip()
        verify_jwt_in_request()
        try:
            user = authenticated_user()
        except (MongoConfigurationError, PyMongoError) as error:
            return database_unavailable(error, "authorize resource request listing")

        if user is None:
            return jsonify({
                "success": False,
                "message": "Account not found. Please sign in again.",
            }), 401

        role = normalize_role(user.get("role", "normal_user"))
        view = request.args.get("view", "").strip().lower()
        if view == "deliveries":
            if role != "volunteer" or verification_status(user) != "approved":
                return jsonify({
                    "success": False,
                    "message": "Only approved volunteers can view delivery tasks.",
                }), 403
            query = {
                "$and": [
                    {"fulfillment_method": "delivery"},
                    {"status": {"$in": ["approved", "volunteer_assigned", "picked_up", "out_for_delivery"]}},
                    {
                        "$or": [
                            {"volunteer_id": user["id"]},
                            {"volunteer_id": {"$exists": False}},
                        ]
                    },
                ]
            }
        elif role == "admin":
            query = {}
        elif role in {"normal_user", "volunteer", "ngo", "blood_bank"}:
            query = {
                "$or": [
                    {"requester_id": user["id"]},
                    {"provider_id": user["id"]},
                    {"volunteer_id": user["id"]},
                ]
            }
        else:
            return jsonify({
                "success": False,
                "message": "This account cannot view resource requests.",
            }), 403

        if resource_id:
            try:
                query["resource_id"] = int(resource_id)
            except ValueError:
                return jsonify({
                    "success": False,
                    "message": "Resource ID must be a valid number.",
                }), 400

        store = app.extensions["mongo_store"]
        try:
            store.ensure_ready()
            requests_list = []
            for item in store.database.resource_requests.find(query).sort(
                "created_at", -1
            ):
                serialized = serialize_document(item)
                if (
                    view == "deliveries"
                    and item.get("volunteer_id") != user["id"]
                ):
                    for private_field in (
                        "requester_id",
                        "requester_name",
                        "contact",
                        "message",
                        "delivery_address",
                    ):
                        serialized.pop(private_field, None)
                    serialized["status_history"] = [
                        {
                            key: value
                            for key, value in event.items()
                            if key != "actor_id"
                        }
                        for event in serialized.get("status_history", [])
                    ]
                requests_list.append(serialized)
        except (MongoConfigurationError, PyMongoError) as error:
            return database_unavailable(error, "load resource requests")

        return jsonify({
            "success": True,
            "count": len(requests_list),
            "requests": requests_list,
        })

    @app.route("/api/requests/<int:request_id>/delivery", methods=["POST"])
    def update_delivery(request_id):
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify(success=False, message="Please send valid JSON data."), 400
        action = str(data.get("action", "")).strip().lower()
        if action not in {"claim", "picked_up", "out_for_delivery", "delivered"}:
            return jsonify(success=False, message="Choose a valid delivery update."), 400

        verify_jwt_in_request()
        try:
            user = authenticated_user()
            if user is None:
                return jsonify(success=False, message="Account not found. Please sign in again."), 401
            if (
                normalize_role(user.get("role", "")) != "volunteer"
                or verification_status(user) != "approved"
            ):
                return jsonify(
                    success=False,
                    message="Only approved volunteers can manage deliveries.",
                ), 403

            store = app.extensions["mongo_store"]
            store.ensure_ready()
            resource_request = store.database.resource_requests.find_one(
                {"_id": request_id}
            )
            if resource_request is None:
                return jsonify(success=False, message="Resource request not found."), 404
            if resource_request.get("fulfillment_method") != "delivery":
                return jsonify(success=False, message="This request is for pickup, not delivery."), 409

            now = datetime.now(timezone.utc)
            current_status = resource_request.get("status")
            volunteer_id = resource_request.get("volunteer_id")
            updates = {}
            if action == "claim":
                if current_status != "approved" or volunteer_id is not None:
                    return jsonify(
                        success=False,
                        message="This delivery is no longer available to claim.",
                    ), 409
                updates = {
                    "status": "volunteer_assigned",
                    "volunteer_id": user["id"],
                    "volunteer_name": user.get("name"),
                    "volunteer_assigned_at": now,
                }
                history_status = "volunteer_assigned"
            else:
                next_status = action
                if volunteer_id != user["id"] or current_status != {
                    "picked_up": "volunteer_assigned",
                    "out_for_delivery": "picked_up",
                    "delivered": "out_for_delivery",
                }[action]:
                    return jsonify(
                        success=False,
                        message="Only the assigned volunteer can make the next delivery update.",
                    ), 409
                updates = {"status": next_status}
                history_status = next_status

            history = list(resource_request.get("status_history") or [])
            history.append({
                "status": history_status,
                "actor_id": user["id"],
                "at": now.isoformat(),
            })
            updates["status_history"] = history
            updates["updated_at"] = now
            result = store.database.resource_requests.update_one(
                {
                    "_id": request_id,
                    "status": current_status,
                    **({"volunteer_id": None} if action == "claim" else {"volunteer_id": user["id"]}),
                },
                {"$set": updates},
            )
            if result.modified_count != 1:
                return jsonify(
                    success=False,
                    message="This delivery was updated by someone else. Refresh and try again.",
                ), 409
        except (MongoConfigurationError, PyMongoError) as error:
            return database_unavailable(error, "update delivery")

        resource_request.update(updates)
        return jsonify({
            "success": True,
            "message": "Delivery status updated.",
            "resource_request": serialize_document(resource_request),
        })

    @app.route("/api/requests/<int:request_id>/review", methods=["POST"])
    def review_resource_request(request_id):
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({
                "success": False,
                "message": "Please send valid JSON data.",
            }), 400

        action = str(data.get("action", "")).strip().lower()
        if action not in {"approved", "rejected", "clarification_requested"}:
            return jsonify({
                "success": False,
                "message": (
                    "Choose approve, reject, or request clarification."
                ),
            }), 400

        note = str(data.get("note", "")).strip()
        if action in {"rejected", "clarification_requested"} and not note:
            return jsonify({
                "success": False,
                "message": "A note is required for this decision.",
            }), 400
        if len(note) > 1000:
            return jsonify({
                "success": False,
                "message": "The note must be 1000 characters or fewer.",
            }), 400

        verify_jwt_in_request()
        try:
            user = authenticated_user()
        except (MongoConfigurationError, PyMongoError) as error:
            return database_unavailable(error, "authorize resource request review")

        if user is None:
            return jsonify({
                "success": False,
                "message": "Account not found. Please sign in again.",
            }), 401

        store = app.extensions["mongo_store"]
        try:
            store.ensure_ready()
            resource_request = store.database.resource_requests.find_one({
                "_id": request_id,
            })
            if resource_request is None:
                return jsonify({
                    "success": False,
                    "message": "Resource request not found.",
                }), 404

            role = normalize_role(user.get("role", "normal_user"))
            is_admin = role == "admin"
            if not is_admin and resource_request.get("provider_id") != user["id"]:
                return jsonify({
                    "success": False,
                    "message": "You are not authorized to review this request.",
                }), 403
            if (
                role in ROLE_DOCUMENTS
                and verification_status(user) != "approved"
            ):
                return jsonify({
                    "success": False,
                    "message": (
                        "Your account must be approved before managing requests."
                    ),
                }), 403

            previous_status = str(resource_request.get("status", "")).lower()
            if previous_status not in {"pending"}:
                return jsonify({
                    "success": False,
                    "message": "Only pending requests can be reviewed.",
                }), 409

            reviewed_at = datetime.now(timezone.utc)
            history = list(resource_request.get("status_history") or [])
            history_status = {
                "approved": "accepted",
                "rejected": "declined",
            }.get(action, action)
            event = {
                "status": history_status,
                "actor_id": user["id"],
                "at": reviewed_at.isoformat(),
            }
            if note:
                event["note"] = note
            history.append(event)
            update_fields = {
                "status": action,
                "reviewed_by": user["id"],
                "reviewed_at": reviewed_at,
                "status_history": history,
            }
            if note:
                update_fields["review_note"] = note

            result = store.database.resource_requests.update_one(
                {
                    "_id": request_id,
                    "status": {"$in": ["pending", "Pending"]},
                },
                {"$set": update_fields},
            )
            if result.modified_count != 1:
                return jsonify({
                    "success": False,
                    "message": (
                        "This request was updated by another reviewer. "
                        "Refresh the list and try again."
                    ),
                }), 409
        except (MongoConfigurationError, PyMongoError) as error:
            return database_unavailable(error, "review resource request")

        updated_request = dict(resource_request)
        updated_request.update(update_fields)
        return jsonify({
            "success": True,
            "message": "Request decision saved.",
            "resource_request": serialize_document(updated_request),
        })

    @app.route("/api/requests/<int:request_id>/response", methods=["POST"])
    def respond_to_resource_request(request_id):
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({
                "success": False,
                "message": "Please send valid JSON data.",
            }), 400

        response_text = str(data.get("response", "")).strip()
        if not response_text or len(response_text) > 1000:
            return jsonify({
                "success": False,
                "message": "Enter a response of 1 to 1000 characters.",
            }), 400

        verify_jwt_in_request()
        try:
            user = authenticated_user()
        except (MongoConfigurationError, PyMongoError) as error:
            return database_unavailable(error, "authorize resource request response")

        if user is None:
            return jsonify({
                "success": False,
                "message": "Account not found. Please sign in again.",
            }), 401

        store = app.extensions["mongo_store"]
        try:
            store.ensure_ready()
            resource_request = store.database.resource_requests.find_one({
                "_id": request_id,
            })
            if resource_request is None:
                return jsonify({
                    "success": False,
                    "message": "Resource request not found.",
                }), 404
            if resource_request.get("requester_id") != user["id"]:
                return jsonify({
                    "success": False,
                    "message": "Only the requester can respond to clarification.",
                }), 403
            if str(resource_request.get("status", "")).lower() != (
                "clarification_requested"
            ):
                return jsonify({
                    "success": False,
                    "message": (
                        "This request is not waiting for your clarification."
                    ),
                }), 409

            updated_at = datetime.now(timezone.utc)
            history = list(resource_request.get("status_history") or [])
            history.append({
                "status": "clarification_received",
                "actor_id": user["id"],
                "at": updated_at.isoformat(),
                "note": response_text,
            })
            result = store.database.resource_requests.update_one(
                {
                    "_id": request_id,
                    "requester_id": user["id"],
                    "status": "clarification_requested",
                },
                {"$set": {
                    "status": "pending",
                    "requester_response": response_text,
                    "updated_at": updated_at,
                    "status_history": history,
                }},
            )
            if result.modified_count != 1:
                return jsonify({
                    "success": False,
                    "message": (
                        "This request changed while you were responding. "
                        "Refresh and try again."
                    ),
                }), 409
        except (MongoConfigurationError, PyMongoError) as error:
            return database_unavailable(error, "save resource request response")

        updated_request = dict(resource_request)
        updated_request.update({
            "status": "pending",
            "requester_response": response_text,
            "updated_at": updated_at,
            "status_history": history,
        })
        return jsonify({
            "success": True,
            "message": "Your clarification was sent to the resource provider.",
            "resource_request": serialize_document(updated_request),
        })

    return app


def database_unavailable(error=None, operation="database operation"):
    if error is not None:
        log_mongodb_error(current_app.logger, operation, error)
    return jsonify({
        "success": False,
        "message": "Database is unavailable. Check the MongoDB configuration.",
    }), 503


app = create_app()


if __name__ == "__main__":
    app.run(debug=False, port=5000)
