# MongoDB Atlas migration

## Current state and safeguards

- The SQLite source is `relink.db`; it is still the authoritative copy until
  the Atlas import has been verified.
- A read-only SQLite backup created during inspection is at
  `relink-pre-mongodb-migration-20261021.db`. Its SQLite integrity check passed.
  The backend ignore rules exclude the database and backups because they
  contain user data.
- The reviewed source schema contains eight tables: `user`,
  `registration_profiles`, `registration_document`, `resource`,
  `resource_request`, `volunteer_assignment`, `transfer_history`, and
  `admin_audit_event`.
- The importer preserves all source columns and IDs, adds MongoDB `_id` values
  matching the SQLite primary keys, and adds a normalized email field for
  case-insensitive account lookup. It never drops a source table or deletes a
  MongoDB document.

## Collection mapping

| SQLite table | MongoDB collection |
| --- | --- |
| `user` | `users` |
| `registration_profiles` | `registration_profiles` |
| `registration_document` | `registration_documents` |
| `resource` | `resources` |
| `resource_request` | `resource_requests` |
| `volunteer_assignment` | `volunteer_assignments` |
| `transfer_history` | `transfer_history` |
| `admin_audit_event` | `admin_audit_events` |

Application-created numeric IDs use an atomic MongoDB counter initialized from
the largest imported ID. The three existing demo resource listings are seeded
only when the `resources` collection is empty.

## Safe execution sequence

1. Keep the backend stopped while taking the final backup. The checked-in-time
   backup above protects the database as inspected; take a fresh backup before
   migration if any SQLite data has changed since then.
2. In `backend`, install the dependencies with
   `python -m pip install -r requirements.txt`.
3. Run `python sqlite_to_mongodb.py` first. This is a read-only dry run; it
   validates SQLite integrity and prints source row counts without requiring
   Atlas credentials or contacting MongoDB.
4. Configure `MONGODB_URI`, `MONGODB_DATABASE`, and a strong `JWT_SECRET_KEY`
   in the local `backend/.env`. Never commit or paste credentials into source
   control.
5. Confirm the Atlas database user, network access list, and cluster are ready.
   Run `python sqlite_to_mongodb.py --apply` to ping Atlas, preflight all
   existing document IDs, import only missing rows, and verify every imported
   document. Existing ID conflicts stop the import before any row is written;
   rerunning after an interrupted import is safe.
6. Call `/api/health` to perform a ping-only connection test. Then start the
   backend and verify signup/login, resources, and requests before switching
   off SQLite access.

The importer intentionally does not truncate, replace, or delete MongoDB
collections. If the import or app verification fails, stop the MongoDB-backed
app and retain both the SQLite database and backup unchanged while resolving
the issue. Do not remove the SQLite files until the Atlas data and application
behavior have been independently confirmed and a separate retention decision
has been made.

## Runtime configuration

The Flask app can be imported and its validation code exercised before Atlas is
configured. Database-dependent routes return an explicit `503`; health returns
`503` until a real connection check succeeds. `MONGODB_URI` is never given a
placeholder/default value in the running app.

The app loads `backend/.env` by an absolute path, regardless of the shell's
working directory. The VS Code backend task also runs Flask from `backend`.
The required URI variable is `MONGODB_URI`; the database name comes from
`MONGODB_DATABASE` (default `resqlink`). Database connections are lazy, so
starting Flask does not by itself prove Atlas connectivity; call
`http://127.0.0.1:5000/api/health`. MongoDB failures are logged with a fixed
diagnostic category and safe next steps, never the exception text or URI.
Categories distinguish authentication, DNS/SRV, explicit Atlas IP access-list
denials, invalid URI configuration, and timeouts/server selection failures.

## Administrator and verification setup

Create the first administrator only after configuring Atlas and the JWT secret.
From `backend`, run:

```powershell
.\.venv\Scripts\python.exe -m flask --app app create-admin
```

The command prompts for a dedicated administrator name, email, and password;
the password prompt is hidden and requires confirmation with at least 12
characters. It creates a new administrator account and refuses an email that
already belongs to any account. It never promotes an existing community,
volunteer, NGO, or blood bank account. Admin accounts cannot be created through
public registration.

Sign in with the administrator credentials in the frontend to open the admin
verification dashboard. Volunteer, NGO / Ashram, and blood bank accounts stay
pending until an administrator approves them. Pending or rejected accounts
cannot publish resources. Rejected applicants can upload replacement
verification documents and resubmit from their account dashboard. Verification
files remain in the ignored `uploads/` directory and are only served through
JWT-protected admin document endpoints; do not expose that directory through a
web server or static-file route.

## Resource request workflow

Resource requests require an authenticated account. New resource listings store
their publisher ID and role in MongoDB, and requests store requester/provider
IDs plus timestamped status history. The request list is restricted to the
requester, the listing's provider, or an administrator. A verified provider
can approve, decline, or request clarification for a pending request; the
requester can answer a clarification request. Decisions are conditional on the
request still being pending, so simultaneous reviews cannot both succeed.

This workflow currently covers resource request review only. Approval does not
reserve stock, create volunteer delivery assignments, provide live tracking,
or implement blood inventory, NGO requirements, or external notifications.
Those workflows require their own persisted APIs and authorization checks and
must not be treated as operational until they are implemented and tested.
