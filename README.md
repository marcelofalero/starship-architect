# Starship Architect

A web application for designing and managing starships for the Star Wars Saga Edition RPG.

## Local Development

This project uses Docker Compose to provide a full-stack local development environment.

### Prerequisites

- Docker and Docker Compose.

### Running the App

1. **Start the stack:**

   From the repository root:

   ```bash
   docker compose up -d
   ```

   This will start:
   - **Frontend App**: `http://localhost:8080` (Nginx serving `public/` + API Proxy)
   - **Backend Service**: `http://localhost:8787` (Cloudflare Worker with D1)
   - **Tests**: Runs integration tests automatically.

   The database schema is applied automatically on startup.

2. **Access the App:**
   Open `http://localhost:8080` in your browser.

### Running Tests

Tests run automatically when `docker compose up` is called. To run them manually:

```bash
docker compose run --rm tests
```

### Architecture

- **Frontend**: Static HTML/JS served via Nginx from `public/`.
- **Backend**: Cloudflare Worker (Python/FastAPI) located in `backend/`.
- **Database**: Cloudflare D1 (SQLite), running locally via Wrangler.
- **Infrastructure**: Terraform definitions in `infrastructure/`.

### Authentication

The system supports both Google SSO and standard Email/Password authentication.
- **Register**: `POST /auth/register`
- **Login**: `POST /auth/login`
- **Google Auth**: `GET /auth/google`

Default development secrets are set in `docker-compose.yml`.
