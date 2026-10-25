import socket
from datetime import datetime, timezone
from threading import Lock

from dns.exception import DNSException # type: ignore
from pymongo import ASCENDING, DESCENDING, MongoClient # type: ignore
from pymongo.errors import ( # type: ignore
    ConfigurationError,
    NetworkTimeout,
    OperationFailure,
    ServerSelectionTimeoutError,
)


DEMO_RESOURCES = (
    {
        "id": 1,
        "title": "Fresh vegetables",
        "category": "Food",
        "description": "Fresh vegetables available for local families.",
        "location": "Mysuru",
        "quantity": "5 kg",
    },
    {
        "id": 2,
        "title": "Engineering textbooks",
        "category": "Books",
        "description": "Used textbooks in good condition.",
        "location": "Mysuru",
        "quantity": "8 books",
    },
    {
        "id": 3,
        "title": "Clothes for donation",
        "category": "Clothes",
        "description": "Clean clothes ready to be donated.",
        "location": "Mysuru",
        "quantity": "10 items",
    },
)


class MongoConfigurationError(RuntimeError):
    pass


def diagnose_mongodb_error(error):
    """Return a fixed diagnostic category and safe remediation hint."""
    chain = []
    pending = [error]
    seen = set()
    while pending:
        current = pending.pop()
        if id(current) in seen:
            continue
        seen.add(id(current))
        chain.append(current)
        pending.extend(
            cause
            for cause in (
                getattr(current, "__cause__", None),
                getattr(current, "__context__", None),
            )
            if cause is not None
        )

    if any(isinstance(item, MongoConfigurationError) for item in chain):
        return (
            "missing_configuration",
            "Set MONGODB_URI and MONGODB_DATABASE in backend/.env.",
        )

    if any(
        isinstance(item, OperationFailure) and getattr(item, "code", None) == 18
        for item in chain
    ):
        return (
            "authentication_failure",
            "Verify the Atlas database username, password, and authentication database.",
        )

    safe_error_text = " ".join(str(item) for item in chain).lower()
    if any(
        isinstance(item, (socket.gaierror, DNSException))
        or type(item).__module__.startswith("dns.")
        for item in chain
    ) or any(
        marker in safe_error_text
        for marker in (
            "dns",
            "srv record",
            "name resolution",
            "name or service not known",
            "nodename nor servname",
        )
    ):
        return (
            "dns_srv_failure",
            "Check DNS/SRV resolution and the Atlas hostname; verify dnspython is installed.",
        )

    if any(
        marker in safe_error_text
        for marker in (
            "not in the access list",
            "not whitelisted",
            "ip access list",
            "ip address is not authorized",
            "ip address is not allowed",
        )
    ):
        return (
            "atlas_ip_access_denied",
            "Add this machine's public IP to the Atlas Network Access IP Access List.",
        )

    if any(isinstance(item, ConfigurationError) for item in chain):
        return (
            "invalid_uri_configuration",
            "Check the MongoDB URI scheme and URL-encode special characters in credentials.",
        )

    if any(isinstance(item, NetworkTimeout) for item in chain):
        return (
            "network_timeout",
            "Check outbound network access, Atlas IP Access List, cluster state, and DNS.",
        )

    if any(
        marker in safe_error_text
        for marker in (
            "cluster is unavailable",
            "cluster is paused",
            "no replica set members found yet",
            "replica set no primary",
        )
    ):
        return (
            "atlas_cluster_unavailable",
            "Check Atlas cluster status; resume a paused cluster and retry the health check.",
        )

    if any(isinstance(item, ServerSelectionTimeoutError) for item in chain):
        return (
            "server_selection_timeout",
            "Check Atlas cluster state, Network Access IP Access List, outbound firewall, and DNS.",
        )

    return (
        "mongodb_error",
        "Check Atlas credentials, Network Access, cluster state, and backend logs.",
    )


def log_mongodb_error(logger, operation, error):
    category, guidance = diagnose_mongodb_error(error)
    logger.error(
        "MongoDB operation failed (operation=%s, category=%s, exception=%s). %s",
        operation,
        category,
        type(error).__name__,
        guidance,
    )


class MongoStore:
    def __init__(self, uri, database_name, client=None):
        self._client = client
        self._uri = uri
        self._database_name = database_name
        self._ready = False
        self._ready_lock = Lock()

    @property
    def configured(self):
        return self._client is not None or bool(self._uri)

    @property
    def client(self):
        if not self.configured:
            raise MongoConfigurationError("MONGODB_URI is not configured.")
        if self._client is None:
            self._client = MongoClient(
                self._uri,
                appname="ResQlink",
                connectTimeoutMS=10000,
                serverSelectionTimeoutMS=10000,
            )
        return self._client

    @property
    def database(self):
        if not self._database_name:
            raise MongoConfigurationError("MONGODB_DATABASE is not configured.")
        return self.client[self._database_name]

    def ping(self):
        self.client.admin.command("ping")

    def ensure_ready(self):
        database = self.database
        with self._ready_lock:
            if self._ready:
                return

            self.ping()
            database.users.create_index(
                [("normalized_email", ASCENDING)],
                unique=True,
                sparse=True,
                name="uq_user_normalized_email",
            )
            database.users.create_index(
                [("role", ASCENDING), ("verification_status", ASCENDING)],
                name="ix_user_directory_role_verification",
            )
            database.resources.create_index(
                [("status", ASCENDING), ("category", ASCENDING)],
                name="ix_resource_status_category",
            )
            database.resources.create_index(
                [("created_at", DESCENDING)],
                name="ix_resource_created_at",
            )
            database.resource_requests.create_index(
                [("resource_id", ASCENDING)],
                name="ix_request_resource_id",
            )
            database.resource_requests.create_index(
                [("created_at", DESCENDING)],
                name="ix_request_created_at",
            )
            database.resource_requests.create_index(
                [("requester_id", ASCENDING), ("created_at", DESCENDING)],
                name="ix_request_requester_created_at",
            )
            database.resource_requests.create_index(
                [("provider_id", ASCENDING), ("created_at", DESCENDING)],
                name="ix_request_provider_created_at",
            )

            self._seed_counter(database, "users", "users")
            self._seed_counter(
                database,
                "resource_requests",
                "resource_requests",
            )
            self._seed_demo_resources(database)
            self._seed_counter(database, "resources", "resources")
            self._ready = True

    def _seed_counter(self, database, counter_name, collection_name):
        highest_id = max(
            (
                document["_id"]
                for document in database[collection_name].find(
                    {"_id": {"$type": "number"}},
                    {"_id": 1},
                )
            ),
            default=0,
        )
        database.counters.update_one(
            {"_id": counter_name},
            {"$max": {"value": highest_id}},
            upsert=True,
        )

    def _seed_demo_resources(self, database):
        resources = database.resources
        if resources.find_one({}, {"_id": 1}) is not None:
            return

        now = datetime.now(timezone.utc)
        resources.insert_many([
            {
                "_id": item["id"],
                **item,
                "status": "Available",
                "created_at": now,
            }
            for item in DEMO_RESOURCES
        ])

    def next_id(self, counter_name):
        from pymongo import ReturnDocument # pyright: ignore[reportMissingImports]

        result = self.database.counters.find_one_and_update(
            {"_id": counter_name},
            {"$inc": {"value": 1}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        return result["value"] # type: ignore


def serialize_document(document):
    result = dict(document)
    mongo_id = result.pop("_id", None)
    if "id" not in result and mongo_id is not None:
        result["id"] = str(mongo_id)
    for key, value in result.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
    return result
