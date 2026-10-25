import logging
import unittest
from io import StringIO
from unittest.mock import patch

from app import ENV_FILE, _resolve_setting, create_app
from mongo_store import (
    MongoConfigurationError,
    diagnose_mongodb_error,
    log_mongodb_error,
)
from pymongo.errors import OperationFailure, ServerSelectionTimeoutError


class MongoDBApiTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            "TESTING": True,
            "MONGODB_URI": None,
            "JWT_SECRET_KEY": "test-only-secret",
        })
        self.client = self.app.test_client()

    def test_blank_process_variable_falls_back_to_env_file(self):
        with patch.dict("os.environ", {"MONGODB_URI": ""}):
            value, source = _resolve_setting(
                "MONGODB_URI",
                {"MONGODB_URI": "mongodb+srv://test.invalid"},
            )

        self.assertEqual(value, "mongodb+srv://test.invalid")
        self.assertEqual(source, "backend/.env")

    def test_nonempty_process_variable_overrides_env_file(self):
        with patch.dict(
            "os.environ",
            {"MONGODB_URI": "mongodb+srv://environment.invalid"},
        ):
            value, source = _resolve_setting(
                "MONGODB_URI",
                {"MONGODB_URI": "mongodb+srv://file.invalid"},
            )

        self.assertEqual(value, "mongodb+srv://environment.invalid")
        self.assertEqual(source, "environment")

    def test_backend_dotenv_path_is_absolute_to_backend_directory(self):
        self.assertEqual(ENV_FILE.name, ".env")
        self.assertEqual(ENV_FILE.parent.name, "backend")
        self.assertTrue(ENV_FILE.is_absolute())

    def test_mongodb_error_diagnostics_distinguish_common_failure_types(self):
        cases = (
            (MongoConfigurationError("unset"), "missing_configuration"),
            (
                OperationFailure("bad credentials", code=18),
                "authentication_failure",
            ),
            (
                ServerSelectionTimeoutError(
                    "DNS query name does not exist"
                ),
                "dns_srv_failure",
            ),
            (
                ServerSelectionTimeoutError(
                    "IP address is not in the access list"
                ),
                "atlas_ip_access_denied",
            ),
            (
                ServerSelectionTimeoutError("cluster is paused"),
                "atlas_cluster_unavailable",
            ),
            (
                ServerSelectionTimeoutError("server selection timed out"),
                "server_selection_timeout",
            ),
        )

        for error, expected_category in cases:
            with self.subTest(expected_category=expected_category):
                category, guidance = diagnose_mongodb_error(error)
                self.assertEqual(category, expected_category)
                self.assertTrue(guidance)

    def test_mongodb_diagnostic_logs_never_include_exception_text(self):
        marker = "must-not-appear-in-logs"
        stream = StringIO()
        logger = logging.getLogger("resqlink.mongo-diagnostic-test")
        handler = logging.StreamHandler(stream)
        logger.addHandler(handler)
        logger.setLevel(logging.ERROR)
        try:
            log_mongodb_error(
                logger,
                "test operation",
                ServerSelectionTimeoutError(marker),
            )
        finally:
            logger.removeHandler(handler)

        output = stream.getvalue()
        self.assertIn("server_selection_timeout", output)
        self.assertNotIn(marker, output)

    def test_application_defers_mongodb_connection_until_a_database_operation(self):
        store = self.app.extensions["mongo_store"]
        self.assertIsNone(store._client)

    def test_health_does_not_claim_unconfigured_database_is_healthy(self):
        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 503)
        self.assertFalse(response.get_json()["success"])
        self.assertEqual(response.get_json()["database"], "unavailable")

    def test_resource_validation_is_available_without_database(self):
        response = self.client.post(
            "/api/resources",
            json={"title": "Incomplete"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("category is required", response.get_json()["message"])

    def test_registration_profile_validation_is_available_without_database(self):
        response = self.client.post(
            "/api/auth/register",
            json={
                "name": "Test User",
                "email": "test@example.com",
                "password": "long-enough-password",
                "role": "normal_user",
                "profile_data": "[]",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json()["message"],
            "Profile details must be a JSON object.",
        )

    def test_registration_explains_missing_mongodb_configuration(self):
        response = self.client.post(
            "/api/auth/register",
            json={
                "name": "Test User",
                "email": "test@example.com",
                "password": "long-enough-password",
                "role": "normal_user",
            },
        )

        self.assertEqual(response.status_code, 503)
        self.assertIn("MONGODB_URI", response.get_json()["message"])
        self.assertIn("restart the backend", response.get_json()["message"])

    def test_login_explains_missing_mongodb_configuration(self):
        response = self.client.post(
            "/api/auth/login",
            json={
                "email": "test@example.com",
                "password": "long-enough-password",
            },
        )

        self.assertEqual(response.status_code, 503)
        self.assertIn("MONGODB_URI", response.get_json()["message"])


if __name__ == "__main__":
    unittest.main()
