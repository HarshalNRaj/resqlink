
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timezone

app = Flask(__name__)
CORS(app)

# Temporary storage for our MVP.
# We'll connect a database after testing these APIs.
resources = [
    {
        "id": 1,
        "title": "Fresh vegetables",
        "category": "Food",
        "description": "Fresh vegetables available for local families.",
        "location": "Mysuru",
        "quantity": "5 kg",
        "status": "Available",
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "id": 2,
        "title": "Engineering textbooks",
        "category": "Books",
        "description": "Used textbooks in good condition.",
        "location": "Mysuru",
        "quantity": "8 books",
        "status": "Available",
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "id": 3,
        "title": "Clothes for donation",
        "category": "Clothes",
        "description": "Clean clothes ready to be donated.",
        "location": "Mysuru",
        "quantity": "10 items",
        "status": "Available",
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
]

# Requests submitted by people who need a resource.
resource_requests = []

ALLOWED_CATEGORIES = {
    "Food",
    "Clothes",
    "Books",
    "Essentials",
    "Other",
}


@app.route("/")
def home():
    return jsonify({
        "success": True,
        "message": "Welcome to RELink API!",
        "status": "Backend is running",
    })


@app.route("/api/health")
def health():
    return jsonify({
        "success": True,
        "message": "RELink backend is healthy",
    })


# Get all available resources, optionally filtered by category.
@app.route("/api/resources", methods=["GET"])
def get_resources():
    category = request.args.get("category", "").strip().lower()

    available_resources = [
        resource
        for resource in resources
        if resource["status"] == "Available"
        and (
            not category
            or resource["category"].lower() == category
        )
    ]

    return jsonify({
        "success": True,
        "count": len(available_resources),
        "resources": available_resources,
    })


# Add a new donation/resource.
@app.route("/api/resources", methods=["POST"])
def create_resource():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "success": False,
            "message": "Please send valid JSON data.",
        }), 400

    required_fields = [
        "title",
        "category",
        "description",
        "location",
        "quantity",
    ]

    for field in required_fields:
        if not isinstance(data.get(field), str) or not data[field].strip():
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

    new_resource = {
        "id": max((item["id"] for item in resources), default=0) + 1,
        "title": data["title"].strip(),
        "category": category,
        "description": data["description"].strip(),
        "location": data["location"].strip(),
        "quantity": data["quantity"].strip(),
        "status": "Available",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    resources.append(new_resource)

    return jsonify({
        "success": True,
        "message": "Resource added successfully!",
        "resource": new_resource,
    }), 201


# Submit a request for an available resource.
@app.route("/api/requests", methods=["POST"])
def create_resource_request():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "success": False,
            "message": "Please send valid JSON data.",
        }), 400

    required_fields = [
        "resource_id",
        "requester_name",
        "contact",
        "message",
    ]

    for field in required_fields:
        value = data.get(field)

        if not isinstance(value, str) or not value.strip():
            return jsonify({
                "success": False,
                "message": f"{field.replace('_', ' ').title()} is required.",
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

    resource = next(
        (
            item for item in resources
            if item["id"] == resource_id
            and item["status"] == "Available"
        ),
        None,
    )

    if resource is None:
        return jsonify({
            "success": False,
            "message": "This resource is unavailable or does not exist.",
        }), 404

    new_request = {
        "id": max(
            (item["id"] for item in resource_requests),
            default=0,
        ) + 1,
        "resource_id": resource["id"],
        "resource_title": resource["title"],
        "requester_name": data["requester_name"].strip(),
        "contact": data["contact"].strip(),
        "message": data["message"].strip(),
        "status": "Pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    resource_requests.append(new_request)

    return jsonify({
        "success": True,
        "message": "Your resource request has been submitted!",
        "resource_request": new_request,
    }), 201


# View submitted resource requests.
@app.route("/api/requests", methods=["GET"])
def get_resource_requests():
    resource_id = request.args.get("resource_id", "").strip()

    if resource_id:
        try:
            selected_id = int(resource_id)
        except ValueError:
            return jsonify({
                "success": False,
                "message": "Resource ID must be a valid number.",
            }), 400

        filtered_requests = [
            item for item in resource_requests
            if item["resource_id"] == selected_id
        ]
    else:
        filtered_requests = resource_requests

    return jsonify({
        "success": True,
        "count": len(filtered_requests),
        "requests": filtered_requests,
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
