# GiveConnect

## Project layout

- `frontend/` contains the React/Vite application and its static assets.
- `backend/` contains the Express API, MongoDB store, and SQLite-to-MongoDB importer.
- Root package scripts run, build, and validate both applications.

## Run frontend and backend

Requirements: Node.js and access to a MongoDB deployment.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `MONGODB_URI` to your MongoDB connection string. Optionally set `MONGODB_DB_NAME` (defaults to `giveconnect`). Keep credentials in `.env`; do not commit them.
3. Run `npm run dev` to start the backend API at `http://localhost:3000` and frontend at `http://localhost:5173`. The Vite frontend proxies `/api` requests to the backend.

You can also run them separately in different terminals with `npm run dev:backend` and `npm run dev:frontend`.

The backend checks MongoDB connectivity before listening and reports a startup error if `MONGODB_URI` is missing or MongoDB cannot be reached. The frontend can start independently, but API-backed features require the backend and MongoDB to be running.

## Existing SQLite data migration

On startup, if `data/giveconnect.db` exists, the server reads every application table and imports its rows into the corresponding MongoDB collection. The SQLite database is opened read-only and is never deleted or modified. Imports use stable document identities and insert-only upserts, so restarting or rerunning the migration is safe and does not overwrite existing MongoDB records. Back up the SQLite file before deployment as an additional precaution.

## Database administration

All backend routes use MongoDB. The admin database panel shows MongoDB collection counts and diagnostics; it does not expose a SQL command runner.

## Production and validation

- `npm run lint` checks the backend and frontend TypeScript.
- `npm run build` writes the frontend bundle to `frontend/dist`.
- With `NODE_ENV=production`, `npm start` starts the API and serves `frontend/dist`.
