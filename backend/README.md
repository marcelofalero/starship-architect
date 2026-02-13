# SWSE Architect - Full Stack Local Environment

This directory contains the backend implementation using Cloudflare Workers (Python/FastAPI) and D1 (SQLite), along with a Docker Compose setup for local development.

## Prerequisites

- Docker and Docker Compose.

## Running Locally

1. **Start the stack:**

   Navigate to the `backend/` directory:

   ```bash
   cd backend
   docker compose up -d
   ```

   This will start:
   - **Backend Service**: `http://localhost:8787` (Cloudflare Worker with D1)
   - **Frontend App**: `http://localhost:8080` (Nginx serving `../public` + API Proxy)

2. **Initialize the local database:**

   Wait for the backend service to be fully up, then apply the schema:

   ```bash
   docker compose exec backend wrangler d1 execute swse-db --local --file=schema.sql
   ```

   This creates the necessary tables (`users`, `ships`, `permissions`, etc.) in the local SQLite database managed by Wrangler.

## Authentication

The system supports both Google SSO and standard Email/Password authentication.

### API Endpoints

- **Register**: `POST /auth/register`
  ```json
  { "email": "user@example.com", "password": "password123", "name": "Test User" }
  ```

- **Login**: `POST /auth/login`
  ```json
  { "email": "user@example.com", "password": "password123" }
  ```
  Returns: `{ "access_token": "...", "token_type": "bearer" }`

- **Google Auth**: `GET /auth/google?token=ID_TOKEN`
  Exchanges a Google ID Token for a session token.

- **Ships**: `GET /ships`, `POST /ships`, `PUT /ships/{id}`, `DELETE /ships/{id}`

- **Sharing**: `PATCH /ships/{id}/share`

## Environment Variables

Default development variables are set in `docker-compose.yml` and `wrangler.toml`.
- `GOOGLE_CLIENT_ID`: `dev-mock-client-id`
- `SESSION_SECRET`: `dev-mock-secret`

## Troubleshooting

- If dependencies fail to load in the backend logs, ensure `requirements.txt` is present and valid.
- If the database is missing (500 errors on API), run the initialization command above.
- Frontend assets are served from `../public`. Changes to files in `public/` will be reflected immediately (no reload needed for Nginx, just browser refresh).
