# Job Application Tracker

A self-hosted job-search manager for tracking applications, interview stages,
follow-ups, reminders, and analytics in one account-scoped workspace. The
browser UI is plain HTML/CSS/JavaScript; the API is Node.js/Express and stores
data in a local SQLite database.

## Why this project

A job search produces separate records for roles to consider, applications
sent, interview stages, and reminders to follow up. This project brings those
records into one private, self-hosted workflow. The repository does not
document a personal origin story, so this description is limited to the
problem and workflow supported by the implementation; it does not claim the
product is unique or based on a particular personal experience.

## Features

- Account registration, login, logout, and password changes.
- Application CRUD, 11 statuses, tags, timeline, search, filters, sorting,
  pagination, and table/card views.
- Interview scheduling and outcome tracking; dated follow-ups with completion
  state.
- In-app reminders for upcoming interviews, overdue follow-ups, and stale
  open applications.
- Dashboard and analytics derived from stored application records.
- CSV import preview with validation and duplicate detection; CSV and JSON
  export.
- Profile, preferences, appearance, and custom job-source settings.
- Responsive frontend, locally served Lucide icons, and no runtime frontend
  framework or chart dependency.

The project stores résumé/cover-letter version labels only; it does not upload
files. It does not integrate with job boards or send email/push notifications.

## Technology

- **Frontend:** static HTML5, CSS3, and browser ES modules.
- **Backend:** Node.js 22.5+, Express, bcryptjs, JWT cookie sessions,
  express-validator, Helmet, CORS, and express-rate-limit.
- **Database:** SQLite via Node's built-in `node:sqlite`.
- **Icons:** a locally vendored subset of Lucide; its ISC notice is at
  [`frontend/icons/LICENSE.lucide.txt`](./frontend/icons/LICENSE.lucide.txt).

## Requirements

- Node.js **22.5 or newer** and npm.
- A modern browser with ES module, `fetch`, and cookie support.
- A writable directory for the SQLite database.

Node's built-in SQLite API may emit an upstream experimental-feature warning.

## Installation and local run

```sh
npm ci
```

Copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`) and
set `JWT_SECRET` to a long, random value. For example:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Start the API:

```sh
npm start
```

In a second terminal, start the static frontend:

```sh
npm run serve:frontend
```

Open `http://localhost:5500`. The API listens at `http://localhost:4000` by
default and initializes the SQLite schema automatically. To initialize it
explicitly, run `npm run db:init`. For development auto-restart, use
`npm run dev`.

## Configuration

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | API listen port | `4000` |
| `FRONTEND_PORT` | Optional static frontend server port | `5500` |
| `DATABASE_PATH` | SQLite database file | `./data/app.db` |
| `NODE_ENV` | Runtime mode | `development` |
| `JWT_SECRET` | JWT signing secret; set a strong unique value in production | Development-only fallback |
| `JWT_EXPIRES_IN` | Session token lifetime | `7d` |
| `SESSION_COOKIE_NAME` | HTTP-only authentication cookie name | `jat_token` |
| `FRONTEND_URL` | Exact allowed frontend origin for CORS | `http://localhost:5500` |

The complete safe template is [`.env.example`](./.env.example). Never commit
`.env` or real secrets. For a separately hosted frontend, configure
`FRONTEND_URL` to its exact origin and set `window.__API_BASE__` before
`frontend/js/app.js` loads. Production deployments should terminate HTTPS at a
reverse proxy and set `NODE_ENV=production`.

## Main workflow

1. Register an account and sign in.
2. Add an application with the employer, role, date, status, and optional
   notes, tags, salary, or source.
3. Filter/search the application list and update statuses as the process
   progresses.
4. Schedule interviews and create follow-up reminders from the application
   detail view.
5. Review upcoming items and analytics on the dashboard; import/export data
   from the application view.

For example, track a software-engineering application from `Applied` through
`Technical Interview`, schedule that interview, then add a dated follow-up
after the conversation.

All application, interview, follow-up, and notification data is scoped to the
authenticated account.

## API overview

Base URL: `http://localhost:4000/api`. Registration and login are public;
other routes require a session cookie or `Authorization: Bearer <token>`.
Cookie-authenticated browser mutations use the CSRF cookie/header pair
automatically.

| Resource | Routes |
|---|---|
| Auth | `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/change-password` |
| Applications | `/applications` (CRUD, search/filter/page), `/applications/:id`, `/applications/:id/status`, `/applications/export/{csv,json}`, `/applications/import/{preview,commit}` |
| Interviews | `/interviews` and `/interviews/:id` |
| Follow-ups | `/followups` and `/followups/:id` |
| Dashboard | `/dashboard/overview`, `/dashboard/stats`, `/dashboard/analytics` |
| Notifications | `/notifications`, `/notifications/:id/read`, `/notifications/read-all` |
| Settings | `/settings/profile`, `/settings/preferences`, `/settings/job-sources`, `/settings/tags` |

Detailed request validation and response behavior are implemented in
`backend/routes/`, `backend/controllers/`, and `backend/validators/`.
Applications list responses are paginated; other resource list response
shapes are endpoint-specific.

## Security and privacy

The API uses bcrypt password hashes, HTTP-only SameSite session cookies,
CSRF checks for cookie-authenticated mutations, server-side validation,
ownership checks, parameterized SQL, rate limits, Helmet security headers,
and generic server-error responses. CORS is restricted to `FRONTEND_URL`.
The static server confines requests to the frontend root and serves only
`GET`/`HEAD` requests.

The database contains personal job-search records. Protect the host, database
backups, environment secrets, and network transport. This project does not
upload résumé files.

## Tests and current status

Run the automated test suite:

```sh
npm test
```

Current automated tests cover static-server root mapping and traversal,
malformed URL handling, local icon delivery, production JWT configuration,
settings and notification API validation, and CSV import validation and
duplicate detection. No browser end-to-end suite is configured; the application
workflows should be manually exercised when changing their UI behavior.

## Project structure

```text
backend/
  config/          Environment and SQLite configuration
  controllers/     HTTP handlers
  database/        Schema initialization
  middleware/      Authentication, CSRF, validation, errors, limits
  routes/          API route declarations
  services/        Business logic and database queries
  validators/      Request validation rules
frontend/
  css/             Design system and responsive styles
  icons/           Local Lucide SVG subset and ISC license notice
  js/              API client, UI modules, analytics, charts, shared helpers
test/              Node test-runner checks
database/schema.sql
data/              Runtime SQLite database (ignored by Git)
README.md
SRS.md
LICENSE
```

## Requirements specification

See [`SRS.md`](./SRS.md) for functional and non-functional requirements,
acceptance criteria, use cases, test scenarios, and known limitations.

## Contributing

Report reproducible issues with steps, expected behavior, and observed
behavior. Keep API validation and per-user ownership checks on the server,
preserve the static frontend's no-CDN runtime, and run `npm test` before
submitting a change.

## License

The project is distributed under the [MIT License](./LICENSE). The Lucide
icon assets retain their separate ISC license notice.
