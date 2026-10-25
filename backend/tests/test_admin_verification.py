import io
import json
import re
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from app import create_app
from flask_jwt_extended import create_access_token
from werkzeug.security import check_password_hash


def _value(document, path):
    value = document
    for part in path.split("."):
        if not isinstance(value, dict) or part not in value:
            return None
        value = value[part]
    return value


def _matches(document, query):
    for key, expected in query.items():
        if key == "$and":
            if not all(_matches(document, clause) for clause in expected):
                return False
            continue
        if key == "$or":
            if not any(_matches(document, clause) for clause in expected):
                return False
            continue

        actual = _value(document, key)
        if isinstance(expected, dict):
            if "$in" in expected and actual not in expected["$in"]:
                return False
            if "$exists" in expected and (actual is not None) != expected["$exists"]:
                return False
            if "$regex" in expected:
                flags = re.IGNORECASE if expected.get("$options") == "i" else 0
                if not re.search(expected["$regex"], str(actual or ""), flags):
                    return False
        elif actual != expected:
            return False
    return True


class FakeResult:
    def __init__(self, modified_count=0):
        self.modified_count = modified_count
        self.matched_count = modified_count


class FakeCursor:
    def __init__(self, documents):
        self.documents = list(documents)

    def sort(self, key, direction):
        return FakeCursor(sorted(
            self.documents,
            key=lambda item: str(_value(item, key) or ""),
            reverse=direction < 0,
        ))

    def limit(self, count):
        return FakeCursor(self.documents[:count])

    def __iter__(self):
        return iter(self.documents)


def response_payload(response):
    payload = response.get_json()
    if not isinstance(payload, dict):
        raise AssertionError("Expected a JSON object response.")
    return payload


def collection_document(collection, query):
    document = collection.find_one(query)
    if not isinstance(document, dict):
        raise AssertionError("Expected a stored MongoDB document.")
    return document


class FakeCollection:
    def __init__(self):
        self.documents = []

    def find_one(self, query=None):
        query = query or {}
        return next(
            (item for item in self.documents if _matches(item, query)),
            None,
        )

    def find(self, query=None):
        query = query or {}
        return FakeCursor(
            item for item in self.documents if _matches(item, query)
        )

    def insert_one(self, document):
        self.documents.append(document.copy())

    def update_one(self, query, update):
        document = self.find_one(query)
        if document is None:
            return FakeResult()
        for key, value in update.get("$set", {}).items():
            cursor = document
            parts = key.split(".")
            for part in parts[:-1]:
                cursor = cursor.setdefault(part, {})
            cursor[parts[-1]] = value
        return FakeResult(1)


class FakeDatabase:
    def __init__(self):
        self.users = FakeCollection()
        self.registration_profiles = FakeCollection()
        self.resources = FakeCollection()
        self.resource_requests = FakeCollection()


class FakeStore:
    def __init__(self):
        self.database = FakeDatabase()
        self.next_ids = {"users": 0, "resources": 0}

    def ensure_ready(self):
        return None

    def next_id(self, name):
        self.next_ids[name] = self.next_ids.get(name, 0) + 1
        return self.next_ids[name]


class AdminVerificationTests(unittest.TestCase):
    def setUp(self):
        self.upload_dir = tempfile.TemporaryDirectory()
        self.app = create_app({
            "TESTING": True,
            "JWT_SECRET_KEY": "test-only-secret-key-at-least-32-bytes",
            "UPLOAD_FOLDER": Path(self.upload_dir.name),
        })
        self.store = FakeStore()
        self.app.extensions["mongo_store"] = self.store
        self.client = self.app.test_client()
        self.store.database.users.insert_one({
            "_id": 900,
            "id": 900,
            "name": "Review Admin",
            "email": "admin@example.test",
            "normalized_email": "admin@example.test",
            "password_hash": "unused",
            "role": "admin",
            "created_at": datetime.now(timezone.utc),
            "verification_status": "not_required",
        })
        with self.app.app_context():
            self.admin_token = create_access_token(identity="900")

    def tearDown(self):
        self.upload_dir.cleanup()

    def register_volunteer(self):
        return self.client.post(
            "/api/auth/register",
            data={
                "name": "Taylor Volunteer",
                "email": "taylor@example.test",
                "password": "test-password-123",
                "role": "volunteer",
                "phone": "555-0100",
                "location": "Mysuru",
                "profile_data": json.dumps({
                    "service_area": "Mysuru",
                    "preferred_tasks": ["Pickup and delivery"],
                    "availability": "Weekends",
                    "transport": "Bicycle",
                    "introduction": "Ready to help",
                }),
                "id_proof": (io.BytesIO(b"identity-pdf"), "identity.pdf"),
                "address_proof": (io.BytesIO(b"address-pdf"), "address.pdf"),
                "profile_photo": (io.BytesIO(b"photo-data"), "photo.jpg"),
            },
            content_type="multipart/form-data",
        )

    def make_token(self, user_id):
        with self.app.app_context():
            token = create_access_token(identity=str(user_id))
        return {"Authorization": f"Bearer {token}"}

    def add_user(self, user_id, role, verification_status="not_required"):
        self.store.database.users.insert_one({
            "_id": user_id,
            "id": user_id,
            "name": f"Test {role}",
            "email": f"{role}-{user_id}@example.test",
            "normalized_email": f"{role}-{user_id}@example.test",
            "role": role,
            "verification_status": verification_status,
        })

    def test_nearby_directory_returns_verified_orgs_and_shared_approximate_locations(self):
        self.add_user(931, "ngo", "approved")
        self.add_user(932, "blood_bank", "approved")
        self.add_user(933, "ngo", "pending")
        self.store.database.users.update_one(
            {"id": 931},
            {"$set": {
                "phone": "private-phone",
                "location": "private street address",
                "profile_data": json.dumps({
                    "organisation_name": "Mysuru Community Kitchen",
                    "city": "Mysuru",
                    "service_area": "Mysuru district",
                    "directory_location_shared": True,
                    "service_latitude": "12.30",
                    "service_longitude": "76.60",
                }),
            }},
        )
        self.store.database.users.update_one(
            {"id": 932},
            {"$set": {
                "profile_data": json.dumps({
                    "facility_name": "Central Blood Bank",
                    "city": "Mysuru",
                    "directory_location_shared": False,
                }),
            }},
        )

        response = self.client.get("/api/nearby?q=mysuru")
        self.assertEqual(response.status_code, 200, response.get_json())
        entries = response.get_json()["organizations"]
        by_id = {entry["id"]: entry for entry in entries}
        self.assertEqual(set(by_id), {931, 932})
        self.assertEqual(by_id[931]["name"], "Mysuru Community Kitchen")
        self.assertEqual(by_id[931]["latitude"], 12.3)
        self.assertNotIn("phone", by_id[931])
        self.assertNotIn("location", by_id[931])
        self.assertNotIn("latitude", by_id[932])

        within_radius = self.client.get(
            "/api/nearby?lat=12.29&lng=76.61&radius_km=10&type=ngo"
        )
        self.assertEqual(within_radius.status_code, 200)
        filtered = within_radius.get_json()["organizations"]
        self.assertEqual(len(filtered), 1)
        self.assertGreater(filtered[0]["distance_km"], 0)

        invalid = self.client.get("/api/nearby?lat=95&lng=1&radius_km=5")
        self.assertEqual(invalid.status_code, 400)

    def test_profile_location_sharing_requires_explicit_valid_org_opt_in(self):
        self.add_user(941, "ngo", "approved")
        headers = self.make_token(941)
        updated = self.client.put(
            "/api/auth/profile",
            headers=headers,
            json={
                "name": "Test NGO",
                "location": "Mysuru",
                "profile_data": {
                    "directory_location_shared": True,
                    "service_latitude": "12.3456",
                    "service_longitude": "76.5432",
                },
            },
        )
        self.assertEqual(updated.status_code, 200, updated.get_json())
        profile = json.loads(collection_document(
            self.store.database.users,
            {"id": 941},
        )["profile_data"])
        self.assertEqual(profile["service_latitude"], "12.35")
        self.assertEqual(profile["service_longitude"], "76.54")

        disabled = self.client.put(
            "/api/auth/profile",
            headers=headers,
            json={
                "name": "Test NGO",
                "location": "Mysuru",
                "profile_data": {
                    "directory_location_shared": False,
                    "service_latitude": "",
                    "service_longitude": "",
                },
            },
        )
        self.assertEqual(disabled.status_code, 200)
        profile = json.loads(collection_document(
            self.store.database.users,
            {"id": 941},
        )["profile_data"])
        self.assertNotIn("service_latitude", profile)

    def test_registration_review_and_verified_resource_permission(self):
        registration = self.register_volunteer()
        self.assertEqual(registration.status_code, 201)
        registration_data = response_payload(registration)
        user = registration_data["user"]
        self.assertEqual(user["verification_status"], "pending")
        user_token = registration_data["access_token"]
        user_headers = {"Authorization": f"Bearer {user_token}"}

        blocked = self.client.post(
            "/api/resources",
            json={
                "title": "Food",
                "category": "Food",
                "description": "Fresh",
                "location": "Mysuru",
                "quantity": "2 kg",
            },
            headers=user_headers,
        )
        self.assertEqual(blocked.status_code, 403)

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        listing = self.client.get("/api/admin/applications", headers=headers)
        self.assertEqual(listing.status_code, 200)
        payload = response_payload(listing)
        self.assertEqual(payload["counts"]["pending"], 1)
        applicant = payload["applications"][0]
        self.assertEqual(applicant["name"], "Taylor Volunteer")
        self.assertEqual(len(applicant["documents"]), 3)

        document_response = self.client.get(
            applicant["documents"][0]["url"],
            headers=headers,
        )
        self.assertEqual(document_response.status_code, 200)
        document_response.close()

        approval = self.client.post(
            f"/api/admin/applications/{user['id']}/decision",
            json={"decision": "approved"},
            headers=headers,
        )
        self.assertEqual(approval.status_code, 200)
        stored_user = collection_document(
            self.store.database.users,
            {"id": user["id"]},
        )
        self.assertEqual(stored_user["verification_status"], "approved")
        self.assertEqual(stored_user["reviewer_id"], 900)
        self.assertIsNotNone(stored_user["reviewed_at"])

        allowed = self.client.post(
            "/api/resources",
            json={
                "title": "Food",
                "category": "Food",
                "description": "Fresh",
                "location": "Mysuru",
                "quantity": "2 kg",
            },
            headers=user_headers,
        )
        self.assertEqual(allowed.status_code, 201)

    def test_resource_requests_are_private_and_provider_can_review_owned_request(self):
        self.add_user(901, "normal_user")
        self.add_user(902, "ngo", "approved")
        self.add_user(903, "ngo", "approved")
        self.store.database.resources.insert_one({
            "_id": 25,
            "id": 25,
            "title": "Emergency meal kits",
            "status": "Available",
            "owner_id": 902,
            "owner_role": "ngo",
        })

        no_auth = self.client.post(
            "/api/requests",
            json={
                "resource_id": "25",
                "requester_name": "Requester",
                "contact": "555-0100",
                "message": "Please help.",
            },
        )
        self.assertEqual(no_auth.status_code, 401)

        submitted = self.client.post(
            "/api/requests",
            json={
                "resource_id": "25",
                "requester_name": "Requester",
                "contact": "555-0100",
                "message": "Please help.",
            },
            headers=self.make_token(901),
        )
        self.assertEqual(submitted.status_code, 201, submitted.get_json())
        request_id = submitted.get_json()["resource_request"]["id"]
        stored = collection_document(
            self.store.database.resource_requests,
            {"_id": request_id},
        )
        self.assertEqual(stored["requester_id"], 901)
        self.assertEqual(stored["provider_id"], 902)
        self.assertEqual(stored["status_history"][0]["status"], "requested")
        self.assertEqual(stored["provider_name"], "Test ngo")

        unauthorized_listing = self.client.get(
            "/api/requests",
            headers=self.make_token(903),
        )
        self.assertEqual(unauthorized_listing.status_code, 200)
        self.assertEqual(unauthorized_listing.get_json()["requests"], [])

        provider_listing = self.client.get(
            "/api/requests",
            headers=self.make_token(902),
        )
        self.assertEqual(provider_listing.status_code, 200)
        self.assertEqual(len(provider_listing.get_json()["requests"]), 1)

        forbidden_review = self.client.post(
            f"/api/requests/{request_id}/review",
            json={"action": "approved"},
            headers=self.make_token(903),
        )
        self.assertEqual(forbidden_review.status_code, 403)

        approved = self.client.post(
            f"/api/requests/{request_id}/review",
            json={"action": "approved"},
            headers=self.make_token(902),
        )
        self.assertEqual(approved.status_code, 200, approved.get_json())
        updated = collection_document(
            self.store.database.resource_requests,
            {"_id": request_id},
        )
        self.assertEqual(updated["status"], "approved")
        self.assertEqual(updated["reviewed_by"], 902)
        self.assertEqual(updated["status_history"][-1]["actor_id"], 902)
        self.assertEqual(updated["status_history"][-1]["status"], "accepted")

        second_decision = self.client.post(
            f"/api/requests/{request_id}/review",
            json={"action": "rejected", "note": "Duplicate"},
            headers=self.make_token(902),
        )
        self.assertEqual(second_decision.status_code, 409)

    def test_donation_photo_is_validated_stored_and_shown_on_resource(self):
        self.add_user(921, "normal_user")
        created = self.client.post(
            "/api/resources",
            data={
                "title": "Warm blankets",
                "category": "Essentials",
                "description": "Clean blankets ready to share.",
                "location": "Mysuru",
                "quantity": "4",
                "photo": (io.BytesIO(b"\x89PNG\r\n\x1a\nimage-data"), "blanket.png"),
            },
            headers=self.make_token(921),
            content_type="multipart/form-data",
        )
        self.assertEqual(created.status_code, 201, created.get_json())
        resource = created.get_json()["resource"]
        self.assertEqual(resource["photo_url"], f"/api/resources/{resource['id']}/photo")

        listed = self.client.get("/api/resources")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.get_json()["resources"][0]["photo_url"], resource["photo_url"])

        photo = self.client.get(resource["photo_url"])
        self.assertEqual(photo.status_code, 200)
        self.assertEqual(photo.mimetype, "image/png")
        self.assertTrue(photo.data.startswith(b"\x89PNG\r\n\x1a\n"))
        photo.close()

    def test_accepted_delivery_can_be_claimed_and_tracked_by_approved_volunteer(self):
        self.add_user(941, "normal_user")
        self.add_user(942, "ngo", "approved")
        self.add_user(943, "volunteer", "approved")
        self.add_user(944, "volunteer", "pending")
        self.add_user(945, "volunteer", "approved")
        self.store.database.resources.insert_one({
            "_id": 51,
            "id": 51,
            "title": "Emergency meal kits",
            "status": "Available",
            "owner_id": 942,
            "owner_role": "ngo",
        })
        submitted = self.client.post(
            "/api/requests",
            json={
                "resource_id": "51",
                "requester_name": "Requester",
                "contact": "555-0100",
                "message": "Delivery needed, please.",
                "fulfillment_method": "delivery",
                "delivery_address": "Community center, 4th Street",
            },
            headers=self.make_token(941),
        )
        self.assertEqual(submitted.status_code, 201, submitted.get_json())
        request_id = submitted.get_json()["resource_request"]["id"]
        self.assertEqual(
            submitted.get_json()["resource_request"]["fulfillment_method"],
            "delivery",
        )

        accepted = self.client.post(
            f"/api/requests/{request_id}/review",
            json={"action": "approved"},
            headers=self.make_token(942),
        )
        self.assertEqual(accepted.status_code, 200, accepted.get_json())

        requester_cannot_claim = self.client.post(
            f"/api/requests/{request_id}/delivery",
            json={"action": "claim"},
            headers=self.make_token(941),
        )
        self.assertEqual(requester_cannot_claim.status_code, 403)

        pending_volunteer_denied = self.client.get(
            "/api/requests?view=deliveries",
            headers=self.make_token(944),
        )
        self.assertEqual(pending_volunteer_denied.status_code, 403)

        available = self.client.get(
            "/api/requests?view=deliveries",
            headers=self.make_token(943),
        )
        self.assertEqual(available.status_code, 200, available.get_json())
        self.assertEqual(len(available.get_json()["requests"]), 1)
        task_before_claim = available.get_json()["requests"][0]
        self.assertNotIn("contact", task_before_claim)
        self.assertNotIn("delivery_address", task_before_claim)

        headers = self.make_token(943)
        claim = self.client.post(
            f"/api/requests/{request_id}/delivery",
            json={"action": "claim"},
            headers=headers,
        )
        self.assertEqual(claim.status_code, 200, claim.get_json())
        another_volunteer_cannot_claim = self.client.post(
            f"/api/requests/{request_id}/delivery",
            json={"action": "claim"},
            headers=self.make_token(945),
        )
        self.assertEqual(another_volunteer_cannot_claim.status_code, 409)
        assigned_task = self.client.get(
            "/api/requests?view=deliveries",
            headers=headers,
        ).get_json()["requests"][0]
        self.assertEqual(
            assigned_task["delivery_address"],
            "Community center, 4th Street",
        )

        for action, expected in (
            ("picked_up", "picked_up"),
            ("out_for_delivery", "out_for_delivery"),
            ("delivered", "delivered"),
        ):
            result = self.client.post(
                f"/api/requests/{request_id}/delivery",
                json={"action": action},
                headers=headers,
            )
            self.assertEqual(result.status_code, 200, result.get_json())
            self.assertEqual(
                result.get_json()["resource_request"]["status"],
                expected,
            )

        stored = collection_document(
            self.store.database.resource_requests,
            {"_id": request_id},
        )
        self.assertEqual(stored["volunteer_id"], 943)
        self.assertEqual(stored["status_history"][-1]["status"], "delivered")
        requester_view = self.client.get(
            "/api/requests",
            headers=self.make_token(941),
        )
        self.assertEqual(
            requester_view.get_json()["requests"][0]["status"],
            "delivered",
        )

    def test_unverified_provider_cannot_review_and_rejection_requires_a_note(self):
        self.add_user(911, "normal_user")
        self.add_user(912, "ngo", "pending")
        self.store.database.resources.insert_one({
            "_id": 26,
            "id": 26,
            "title": "Blankets",
            "status": "Available",
            "owner_id": 912,
            "owner_role": "ngo",
        })
        self.store.database.resource_requests.insert_one({
            "_id": 31,
            "id": 31,
            "resource_id": 26,
            "requester_id": 911,
            "provider_id": 912,
            "status": "pending",
        })

        missing_note = self.client.post(
            "/api/requests/31/review",
            json={"action": "rejected"},
            headers=self.make_token(912),
        )
        self.assertEqual(missing_note.status_code, 400)

        blocked = self.client.post(
            "/api/requests/31/review",
            json={"action": "approved"},
            headers=self.make_token(912),
        )
        self.assertEqual(blocked.status_code, 403)

    def test_requester_can_reply_to_provider_clarification(self):
        self.add_user(921, "normal_user")
        self.add_user(922, "normal_user")
        self.store.database.resources.insert_one({
            "_id": 27,
            "id": 27,
            "title": "Water containers",
            "status": "Available",
            "owner_id": 922,
            "owner_role": "normal_user",
        })
        self.store.database.resource_requests.insert_one({
            "_id": 32,
            "id": 32,
            "resource_id": 27,
            "requester_id": 921,
            "provider_id": 922,
            "status": "pending",
            "status_history": [{"status": "pending"}],
        })

        clarification = self.client.post(
            "/api/requests/32/review",
            json={
                "action": "clarification_requested",
                "note": "How many containers are needed?",
            },
            headers=self.make_token(922),
        )
        self.assertEqual(clarification.status_code, 200)

        outsider_response = self.client.post(
            "/api/requests/32/response",
            json={"response": "Two containers."},
            headers=self.make_token(922),
        )
        self.assertEqual(outsider_response.status_code, 403)

        response = self.client.post(
            "/api/requests/32/response",
            json={"response": "Two containers, please."},
            headers=self.make_token(921),
        )
        self.assertEqual(response.status_code, 200, response.get_json())
        updated = collection_document(
            self.store.database.resource_requests,
            {"_id": 32},
        )
        self.assertEqual(updated["status"], "pending")
        self.assertEqual(
            updated["requester_response"],
            "Two containers, please.",
        )

    def test_unauthorized_users_cannot_list_review_or_view_documents(self):
        registration = self.register_volunteer()
        registration_data = response_payload(registration)
        user = registration_data["user"]
        user_headers = {
            "Authorization": f"Bearer {registration_data['access_token']}"
        }

        self.assertEqual(
            self.client.get("/api/admin/applications").status_code,
            401,
        )
        self.assertEqual(
            self.client.get(
                "/api/admin/applications",
                headers=user_headers,
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.get(
                f"/api/admin/applications/{user['id']}/documents/id_proof",
                headers=user_headers,
            ).status_code,
            403,
        )
        stored_documents = json.loads(
            collection_document(
                self.store.database.users,
                {"id": user["id"]},
            )[
                "registration_profile"
            ]["documents_json"]
        )
        self.assertEqual(
            self.client.get(
                f"/uploads/verification/{stored_documents['id_proof']}"
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.post(
                f"/api/admin/applications/{user['id']}/decision",
                json={"decision": "approved"},
                headers=user_headers,
            ).status_code,
            403,
        )

        with self.app.app_context():
            forged_claims_token = create_access_token(
                identity=str(user["id"]),
                additional_claims={"role": "admin"},
            )
        self.assertEqual(
            self.client.get(
                "/api/admin/applications",
                headers={"Authorization": f"Bearer {forged_claims_token}"},
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.post(
                "/api/auth/register",
                json={
                    "name": "Public Admin",
                    "email": "public-admin@example.test",
                    "password": "test-password-123",
                    "role": "admin",
                },
            ).status_code,
            403,
        )

    def test_account_owner_can_update_profile_and_photo_privately(self):
        registration = response_payload(self.register_volunteer())
        headers = {"Authorization": f"Bearer {registration['access_token']}"}
        updated = self.client.put(
            "/api/auth/profile",
            headers=headers,
            data={
                "name": "Taylor Updated",
                "phone": "555-0101",
                "location": "Mysuru",
                "profile_data": json.dumps({
                    "bio": "Happy to help nearby.",
                    "city": "Mysuru",
                    "emergency_contact_name": "Alex",
                    "emergency_contact_phone": "555-0102",
                    "role": "admin",
                }),
                "profile_photo": (
                    io.BytesIO(b"\x89PNG\r\n\x1a\nprofile-image"),
                    "avatar.png",
                ),
            },
            content_type="multipart/form-data",
        )

        self.assertEqual(updated.status_code, 200, updated.get_json())
        user_data = response_payload(updated)["user"]
        self.assertEqual(user_data["name"], "Taylor Updated")
        self.assertEqual(user_data["profile_data"]["bio"], "Happy to help nearby.")
        self.assertEqual(user_data["profile_data"]["city"], "Mysuru")
        self.assertEqual(user_data["role"], "volunteer")
        self.assertEqual(user_data["verification_status"], "pending")
        self.assertEqual(user_data["profile_photo_url"], "/api/auth/profile/photo")

        self.assertEqual(self.client.get("/api/auth/profile/photo").status_code, 401)
        self.assertEqual(
            self.client.put("/api/auth/profile").status_code,
            401,
        )
        photo = self.client.get(
            "/api/auth/profile/photo",
            headers=headers,
        )
        self.assertEqual(photo.status_code, 200)
        self.assertEqual(photo.mimetype, "image/png")
        self.assertEqual(photo.headers["Cache-Control"], "private, no-store")
        self.assertTrue(photo.data.startswith(b"\x89PNG\r\n\x1a\n"))
        photo.close()

    def test_profile_update_rejects_invalid_or_oversized_photos(self):
        registration = response_payload(self.register_volunteer())
        user = registration["user"]
        headers = {"Authorization": f"Bearer {registration['access_token']}"}
        invalid_photo = self.client.put(
            "/api/auth/profile",
            headers=headers,
            data={
                "name": "Taylor Volunteer",
                "profile_data": "{}",
                "profile_photo": (io.BytesIO(b"not-an-image"), "avatar.png"),
            },
            content_type="multipart/form-data",
        )
        self.assertEqual(invalid_photo.status_code, 400)

        oversized_photo = self.client.put(
            "/api/auth/profile",
            headers=headers,
            data={
                "name": "Taylor Volunteer",
                "profile_data": "{}",
                "profile_photo": (
                    io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"x" * (3 * 1024 * 1024)),
                    "avatar.png",
                ),
            },
            content_type="multipart/form-data",
        )
        self.assertEqual(oversized_photo.status_code, 400)
        self.assertIsNotNone(registration["user"]["id"])
        with self.app.app_context():
            forged_claims_token = create_access_token(
                identity=str(user["id"]),
                additional_claims={"role": "admin"},
            )
        self.assertEqual(
            self.client.get(
                "/api/admin/applications",
                headers={"Authorization": f"Bearer {forged_claims_token}"},
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.post(
                "/api/auth/register",
                json={
                    "name": "Public Admin",
                    "email": "public-admin@example.test",
                    "password": "test-password-123",
                    "role": "admin",
                },
            ).status_code,
            403,
        )

    def test_admin_bootstrap_creates_a_separate_dedicated_account(self):
        self.store.database.users.insert_one({
            "_id": 901,
            "id": 901,
            "name": "Community Member",
            "email": "member@example.test",
            "normalized_email": "member@example.test",
            "role": "normal_user",
        })
        password = "Long-Test-Admin-Password-2026!"
        result = self.app.test_cli_runner().invoke(
            args=["create-admin"],
            input=(
                "Operations Admin\n"
                "ops-admin@example.test\n"
                f"{password}\n"
                f"{password}\n"
            ),
        )

        self.assertEqual(result.exit_code, 0, result.output)
        created_admin = collection_document(
            self.store.database.users,
            {"normalized_email": "ops-admin@example.test"},
        )
        ordinary_user = collection_document(
            self.store.database.users,
            {"id": 901},
        )
        self.assertEqual(created_admin["role"], "admin")
        self.assertTrue(check_password_hash(created_admin["password_hash"], password))
        self.assertEqual(ordinary_user["role"], "normal_user")

    def test_rejection_reason_and_resubmission_return_application_to_pending(self):
        registration = self.register_volunteer()
        registration_data = response_payload(registration)
        user = registration_data["user"]
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        route = f"/api/admin/applications/{user['id']}/decision"

        missing_reason = self.client.post(
            route,
            json={"decision": "rejected"},
            headers=admin_headers,
        )
        self.assertEqual(missing_reason.status_code, 400)

        rejection = self.client.post(
            route,
            json={
                "decision": "rejected",
                "rejection_reason": "Please submit a clearer identity proof.",
            },
            headers=admin_headers,
        )
        self.assertEqual(rejection.status_code, 200)
        stored_user = collection_document(
            self.store.database.users,
            {"id": user["id"]},
        )
        self.assertEqual(stored_user["verification_status"], "rejected")
        self.assertEqual(
            stored_user["rejection_reason"],
            "Please submit a clearer identity proof.",
        )

        resubmission = self.client.post(
            "/api/auth/resubmit",
            headers={
                "Authorization": f"Bearer {registration_data['access_token']}"
            },
            data={
                "id_proof": (io.BytesIO(b"updated-id"), "updated.pdf"),
                "address_proof": (io.BytesIO(b"updated-address"), "updated-address.pdf"),
                "profile_photo": (io.BytesIO(b"updated-photo"), "updated.jpg"),
            },
            content_type="multipart/form-data",
        )
        self.assertEqual(resubmission.status_code, 200)
        updated = response_payload(resubmission)["user"]
        self.assertEqual(updated["verification_status"], "pending")
        self.assertIsNone(updated["rejection_reason"])

        listing = self.client.get(
            "/api/admin/applications?status=pending",
            headers=admin_headers,
        )
        self.assertEqual(response_payload(listing)["counts"]["pending"], 1)


if __name__ == "__main__":
    unittest.main()
