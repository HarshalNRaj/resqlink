import argparse
import os
import sqlite3
import sys
from pathlib import Path

from dotenv import load_dotenv
from pymongo import ASCENDING, MongoClient
from pymongo.errors import PyMongoError


BASE_DIR = Path(__file__).resolve().parent
COLLECTIONS = {
    "admin_audit_event": "admin_audit_events",
    "registration_document": "registration_documents",
    "registration_profiles": "registration_profiles",
    "resource": "resources",
    "resource_request": "resource_requests",
    "transfer_history": "transfer_history",
    "user": "users",
    "volunteer_assignment": "volunteer_assignments",
}
COUNTER_COLLECTIONS = {"users", "resources", "resource_requests"}


class MigrationError(RuntimeError):
    pass


def read_sqlite_documents(source_path):
    if not source_path.is_file():
        raise MigrationError(f"SQLite source does not exist: {source_path}")

    uri = f"file:{source_path.as_posix()}?mode=ro"
    with sqlite3.connect(uri, uri=True) as connection:
        integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
        if integrity != "ok":
            raise MigrationError(f"SQLite integrity check failed: {integrity}")

        found_tables = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master "
                "WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            )
        }
        unexpected_tables = found_tables.difference(COLLECTIONS)
        missing_tables = set(COLLECTIONS).difference(found_tables)
        if unexpected_tables or missing_tables:
            raise MigrationError(
                "SQLite schema differs from the reviewed migration map. "
                f"Unexpected tables: {sorted(unexpected_tables)}; "
                f"missing tables: {sorted(missing_tables)}."
            )

        result = {}
        for table, collection in COLLECTIONS.items():
            quoted_table = '"' + table.replace('"', '""') + '"'
            columns = [
                row[1]
                for row in connection.execute(
                    f"PRAGMA table_info({quoted_table})"
                )
            ]
            if "id" not in columns:
                raise MigrationError(
                    f"Table {table!r} has no reviewed primary-key column."
                )

            documents = []
            for row in connection.execute(f"SELECT * FROM {quoted_table}"):
                document = dict(zip(columns, row))
                primary_key = document["id"]
                if primary_key is None:
                    raise MigrationError(
                        f"Table {table!r} contains a row without an ID."
                    )
                document["_id"] = primary_key
                if table == "user":
                    email = document.get("email")
                    if not isinstance(email, str):
                        raise MigrationError(
                            "A user row has an invalid email value."
                        )
                    document["normalized_email"] = email.strip().lower()
                documents.append(document)
            result[collection] = documents

    normalized_emails = [
        document["normalized_email"]
        for document in result["users"]
    ]
    if len(normalized_emails) != len(set(normalized_emails)):
        raise MigrationError(
            "SQLite contains duplicate emails when compared case-insensitively; "
            "resolve those records before importing."
        )
    return result


def preflight_existing_documents(database, collection_documents):
    missing = {name: [] for name in collection_documents}
    for collection_name, documents in collection_documents.items():
        collection = database[collection_name]
        for document in documents:
            existing = collection.find_one({"_id": document["_id"]})
            if existing is None:
                missing[collection_name].append(document)
            elif existing != document:
                raise MigrationError(
                    "Migration stopped before writing because a MongoDB "
                    f"document conflicts with SQLite ID {document['_id']} "
                    f"in collection {collection_name!r}. No existing "
                    "MongoDB documents were changed."
                )
    return missing


def migrate(database, collection_documents):
    missing = preflight_existing_documents(database, collection_documents)
    database.users.create_index(
        [("normalized_email", ASCENDING)],
        unique=True,
        sparse=True,
        name="uq_user_normalized_email",
    )
    database.resources.create_index(
        [("status", ASCENDING), ("category", ASCENDING)],
        name="ix_resource_status_category",
    )
    database.resources.create_index(
        [("created_at", -1)],
        name="ix_resource_created_at",
    )
    database.resource_requests.create_index(
        [("resource_id", ASCENDING)],
        name="ix_request_resource_id",
    )
    database.resource_requests.create_index(
        [("created_at", -1)],
        name="ix_request_created_at",
    )

    for collection_name, documents in missing.items():
        if documents:
            database[collection_name].insert_many(documents, ordered=True)

    for collection_name in COUNTER_COLLECTIONS:
        highest_id = max(
            (
                document["_id"]
                for document in collection_documents[collection_name]
            ),
            default=0,
        )
        database.counters.update_one(
            {"_id": collection_name},
            {"$max": {"value": highest_id}},
            upsert=True,
        )

    for collection_name, documents in collection_documents.items():
        collection = database[collection_name]
        for document in documents:
            if collection.find_one({"_id": document["_id"]}) != document:
                raise MigrationError(
                    "Post-import verification failed for "
                    f"{collection_name!r} ID {document['_id']}."
                )
        if collection.count_documents({}) < len(documents):
            raise MigrationError(
                f"Post-import document count is too small for {collection_name!r}."
            )


def main():
    load_dotenv(BASE_DIR / ".env")
    parser = argparse.ArgumentParser(
        description="Safely copy SQLite rows into MongoDB without deleting data."
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=BASE_DIR / "relink.db",
        help="Read-only SQLite source (default: backend/relink.db).",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Connect to MongoDB and insert missing rows; default is dry-run.",
    )
    parser.add_argument(
        "--database",
        default=os.environ.get("MONGODB_DATABASE", "resqlink"),
        help="MongoDB database name (default: MONGODB_DATABASE or resqlink).",
    )
    arguments = parser.parse_args()

    try:
        collection_documents = read_sqlite_documents(
            arguments.source.resolve()
        )
        print(f"SQLite source integrity: ok ({arguments.source.resolve()})")
        for collection_name, documents in collection_documents.items():
            print(f"{collection_name}: {len(documents)} source rows")

        if not arguments.apply:
            print(
                "Dry run only: no MongoDB connection or data writes were made. "
                "Review the counts, take a fresh SQLite backup, then rerun "
                "with --apply when Atlas credentials are configured."
            )
            return 0

        uri = os.environ.get("MONGODB_URI")
        if not uri:
            raise MigrationError(
                "MONGODB_URI is required for --apply; no data was written."
            )

        with MongoClient(
            uri,
            appname="ResQlink SQLite migration",
            connectTimeoutMS=10000,
            serverSelectionTimeoutMS=10000,
        ) as client:
            client.admin.command("ping")
            database = client[arguments.database]
            migrate(database, collection_documents)

        print(
            "Migration and per-document verification completed. "
            "SQLite source and backups were not modified or deleted."
        )
        return 0
    except (MigrationError, PyMongoError, sqlite3.Error) as error:
        print(f"Migration failed safely: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
