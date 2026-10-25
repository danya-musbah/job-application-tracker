# Software Requirements Specification

## 1. Introduction

### 1.1 Purpose

This document describes the requirements supported by the current Job
Application Tracker implementation. It is intended for users, maintainers,
and contributors validating behavior or planning changes.

### 1.2 Scope

The system is a self-hosted web application for recording and managing an
individual's job search. It combines a browser-based interface, an Express
JSON API, and a local SQLite database. Its current scope covers account
management, application tracking, interview and follow-up records,
notifications, preferences, CSV import/export, and dashboard analytics.
Requirements below describe the code currently present; items identified as
future work are not part of this release.

### 1.3 Terms

| Term | Meaning |
|---|---|
| Application | A job opportunity and its status, employer, role, and notes |
| Follow-up | A dated reminder or action associated with an application |
| Interview | A scheduled interview stage associated with an application |
| Owner | The authenticated user who owns a record |
| CSRF | Cross-site request forgery |
| SQLite | Embedded relational database stored in a file |

## 2. Overall Description

### 2.1 Product context

The frontend is static HTML, CSS, and browser ES modules. It communicates
with a Node.js/Express API over JSON and cookie-based sessions. The API
persists records in SQLite through Node's built-in `node:sqlite` module.
There is no external job-board, email, file-storage, or analytics service in
the implemented workflow.

### 2.2 User classes

- **Account holder:** registers or signs in and manages only records owned by
  that account. The current implementation has no administrator role.
- **Maintainer:** configures and runs the application and may inspect its
  source and local database. This is an operational responsibility, not an
  application-level role.

### 2.3 Operating environment

- Node.js 22.5 or later and npm, as declared in `package.json`.
- A modern browser supporting ES modules, `fetch`, cookies, and
  `AbortController`.
- A writable local filesystem for the SQLite database.
- The frontend may use the included static server or another static host.
  Cookie-authenticated deployments must configure the matching frontend
  origin and use HTTPS in production.

### 2.4 Constraints and assumptions

- SQLite is the only implemented database.
- The server loads configuration from the root `.env` file when present.
- Production startup requires an explicitly configured JWT secret; the
  development fallback is intentionally unsuitable for production.
- No résumé or cover-letter content is uploaded; only version labels are
  recorded.
- The exact personal motivation and copyright holder were not provided.

## 3. Functional Requirements

Each requirement below is observable through the current UI or API.

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-001 | The system shall allow a user to register, log in, resume an existing session, and log out. | Valid credentials create or resume a session; invalid credentials are rejected; logout clears the session. |
| FR-002 | The system shall keep job-search records scoped to their owner. | An authenticated user can list and modify their records; an attempt to access another user's record does not return or change it. |
| FR-003 | The system shall create, view, edit, delete, and change the status of job applications. | A saved application appears in lists/details; changes persist after reload; deletion removes the application and dependent records according to database constraints. |
| FR-004 | The system shall let users organize and find applications. | Users can search, filter, sort, paginate, and switch between table and card presentation; selection lists can load records beyond the first API page. |
| FR-005 | The system shall record interview schedules and outcomes against an application. | Users can create, edit, list, and delete interviews and record type, date, optional time/details, and result. |
| FR-006 | The system shall record dated follow-ups and completion state against an application. | Users can create, edit, list, mark complete, and delete follow-ups; overdue and upcoming views reflect date and completion state. |
| FR-007 | The system shall generate in-app reminders for upcoming interviews, overdue follow-ups, and stale open applications. | Loading the dashboard generates non-duplicate reminders; stale-application age uses the user's configured preference. |
| FR-008 | The system shall present application statistics and analytics derived from stored records. | Dashboard and analytics views request API data and render status, source, timeline, and conversion-rate summaries without fixed sample values. |
| FR-009 | The system shall export application data as CSV or JSON. | The authenticated owner can download exported application records. |
| FR-010 | The system shall support previewing and committing CSV imports. | Preview reports valid, invalid, and duplicate rows; commit reports imported, skipped, and failed records without treating rejected rows as imported. |
| FR-011 | The system shall let users update profile and preferences. | Profile changes and supported defaults, page size, reminder window, and appearance persist and are returned by their endpoints. |
| FR-012 | The system shall allow users to add custom job sources and view tags. | Custom sources are associated with the current account; tag lists contain that account's tags. |
| FR-013 | The system shall provide validation and user-visible failure feedback for failed operations. | Invalid API inputs receive structured validation errors; failed UI requests do not appear successful and can be retried where the interface offers retry behavior. |

## 4. Data Requirements

### 4.1 Entities and relationships

- A user owns applications, job sources, tags, events, interviews,
  follow-ups, and notifications.
- Applications can reference tags through the `application_tags` join table.
- Interviews, follow-ups, timeline events, and application-related
  notifications reference an application.
- Foreign keys and uniqueness/check constraints are declared in
  `database/schema.sql`; foreign-key actions cascade to dependent records
  where configured.

### 4.2 Validation and business rules

- Application status, location type, employment type, priority, interview
  type, interview result, and theme are constrained to supported values.
- Required application values include company, job title, and application
  date; interview and follow-up records require an application and date.
- Resource operations include the authenticated owner in data access
  conditions.
- API validation is server-side; client-side validation is for user feedback
  and does not replace it.

## 5. External Interface Requirements

### 5.1 User interface

The interface provides sign-in/registration forms, responsive application
views, dashboard and analytics views, interview and follow-up forms,
notifications, settings, and dialogs for detail/import workflows. Icon-only
controls have accessible names. Decorative icons are hidden from assistive
technology. Modals support keyboard dismissal and focus management; status
is communicated with more than color alone.

### 5.2 API and integrations

- The browser calls the `/api` JSON endpoints served by Express.
- Cookie-based requests use credentials and a CSRF double-submit token for
  state-changing operations.
- CORS allows the configured `FRONTEND_URL`; external integrations are not
  required for core operation.
- The frontend uses local Lucide SVG assets; loading the interface does not
  require an icon CDN.

## 6. Security and Privacy Requirements

| ID | Requirement | Verification |
|---|---|---|
| NFR-SEC-001 | Passwords shall be stored as bcrypt hashes, not plaintext. | Inspect registration/password-change persistence and schema. |
| NFR-SEC-002 | Cookie sessions shall be HTTP-only and SameSite-protected; production cookies shall use Secure. | Inspect authentication cookie options. |
| NFR-SEC-003 | Cookie-authenticated state-changing requests shall validate the CSRF token. | Requests without a matching token are rejected by middleware. |
| NFR-SEC-004 | SQL statements shall use parameterized user input, and resource queries shall enforce owner scope. | Review service queries and ownership predicates. |
| NFR-SEC-005 | API errors shall not disclose stack traces or internal database details to clients. | Trigger an unexpected server error and verify the generic response. |
| NFR-SEC-006 | The application shall not store uploaded résumé files because file upload is not a supported feature. | Verify no upload endpoint or file persistence path is exposed. |

The database contains personal job-search information. Operators are
responsible for protecting the host, database backups, environment secrets,
and network transport.

## 7. Non-Functional Requirements

- **NFR-001 — Runtime:** the server shall run on Node.js 22.5 or later, as
  declared by the package manifest.
- **NFR-002 — Responsiveness:** the interface shall adapt navigation and
  application presentation to narrow viewports and support keyboard focus.
- **NFR-003 — Offline dependencies:** core frontend assets, charts, and icons
  shall be served locally; API-backed data changes require a reachable API.
- **NFR-004 — Maintainability:** business logic shall remain separated into
  route, controller, service, and persistence/configuration layers.
- **NFR-005 — Data durability:** successful database writes shall persist in
  the configured SQLite file and foreign-key behavior shall be enabled.
- **NFR-006 — Error handling:** the UI shall surface operation failures
  without representing failed requests as successful.

No numerical latency, availability, or concurrency target is specified by
the current project.

## 8. Use Cases

### UC-001: Track a new application

1. The account holder signs in.
2. The user opens the application form and enters the employer, role,
   application date, and optional details.
3. The system validates and saves the record.
4. The application appears in the list and contributes to dashboard data.

**Exception:** invalid fields are reported and the record is not saved.

### UC-002: Plan and record an interview

1. The user selects an application and schedules an interview with a type
   and date.
2. The interview appears in the interview view and upcoming dashboard list.
3. The user records the result after the interview.

**Exception:** a missing application or invalid date is rejected by server
validation.

### UC-003: Import applications

1. The user selects a CSV file and reviews the import preview.
2. The system identifies invalid and duplicate rows.
3. The user confirms commit.
4. The system reports imported, skipped, and failed row counts.

**Exception:** preview validation errors are shown before commit; rejected
rows are not treated as imported.

## 9. Acceptance and Test Coverage

| Test ID | Related requirement | Test |
|---|---|---|
| T-001 | FR-001 | Register a user, resume the session, log out, and confirm the old session is rejected. |
| T-002 | FR-002, NFR-SEC-004 | Use two accounts and verify record reads/updates/deletes remain owner-scoped. |
| T-003 | FR-003, FR-004 | Create, edit, search, filter, sort, paginate, and delete an application. |
| T-004 | FR-005, FR-006 | Create, update, complete, and remove interview and follow-up records. |
| T-005 | FR-007 | Generate reminders from qualifying records and verify repeated dashboard loads do not duplicate unread reminders. |
| T-006 | FR-008 | Change stored data and verify dashboard analytics reflect it. |
| T-007 | FR-009, FR-010 | Export records and preview/import valid, invalid, zero-salary, and duplicate CSV rows. |
| T-008 | FR-011, FR-012 | Save settings and custom job sources, then reload and verify persistence; invalid settings/source payloads return 422. |
| T-009 | FR-013 | Submit invalid input and simulate an unavailable API; verify visible error handling. |
| T-010 | NFR-SEC-003 | Submit a cookie-authenticated mutation without a valid CSRF header and verify rejection. |
| T-011 | Static server | Run `npm test` to check root mapping, sibling traversal rejection, malformed URL handling, and local icon delivery. |
| T-012 | NFR-SEC-001, NFR-SEC-002 | Start configuration in production mode with an empty signing secret and verify startup is rejected. |
| T-013 | FR-013 | Verify invalid notification IDs return 422 and nonexistent account-owned notifications return 404 rather than success. |

Automated tests cover the static server, production secret configuration,
settings/notification validation, and CSV import validation/duplicate
detection. The remaining cases above are acceptance scenarios and require
additional API/database or browser integration tests.

## 10. Known Limitations and Future Requirements

### Current limitations

- No password-reset or email-verification flow.
- No file uploads, job-board integrations, email reminders, or mobile app.
- SQLite is a single-host persistence choice; no distributed deployment
  strategy is implemented.
- Automated browser and end-to-end coverage is not configured.
- The upstream Node.js SQLite API is experimental in the declared runtime.

### Future work (not current requirements)

- Add integration and browser-level tests for the functional acceptance
  scenarios above.
- Evaluate account recovery and optional external job-source integrations.
- Define backup/restore and migration procedures before changing persistent
  schema or deploying across multiple instances.
