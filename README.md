
# Pratyayati Ops

A return request management system for creating, reviewing, approving, and tracking product return requests through a controlled lifecycle.

## Overview

Pratyayati Ops helps manage return requests through a centralized dashboard. It supports request creation, status transitions, resolution decisions, activity notes, duplicate prevention, and non-destructive request removal.

### Key Features

- Create return requests with automatically generated references.
- View requests and status counts on a dashboard.
- Search, filter, sort, and paginate requests on the server.
- Enforce valid status transitions on the backend.
- Record refund, replacement, and store-credit decisions.
- Maintain categorized, chronological activity notes.
- Prevent duplicate active requests for the same order and item.
- Lock customer and item details after a final decision.
- Soft-remove requests while retaining their records.
- Seed the database with sample requests for development and testing.

## Technology Stack

- **Frontend:** Next.js App Router, React, Tailwind CSS
- **Backend:** Next.js Route Handlers
- **Language:** JavaScript for application code
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Database hosting:** Supabase PostgreSQL

## Architecture

The application uses a single Next.js application with server-side route handlers and PostgreSQL persistence.

```text
Client / Dashboard
        |
        v
Next.js Route Handlers
        |
        +-- Request validation
        |
        +-- Business logic
        |
        +-- Status and lifecycle rules
        |
        v
Prisma ORM
        |
        v
PostgreSQL (Supabase)
```

### Backend responsibilities

- **Route handlers:** Process HTTP requests and return appropriate responses.
- **Validation:** Validate required fields, email addresses, supported enum values, resolution data, and status transitions.
- **Service logic:** Create requests, generate references, and handle duplicate-request checks.
- **Database:** Persist requests and notes, enforce uniqueness constraints, and retain removal metadata.

## Product Decision Log

### Decision 01: Dashboard-first experience

**Status:** Finalized

**Decision:** Make the dashboard the primary entry point, with compact status-count cards above the request table.

**Why:** Users should understand the request workload and locate requests quickly without navigating through multiple screens.

**Implementation:** The list API returns requests, pagination metadata, and status counts.

### Decision 02: Dedicated request creation page

**Status:** Finalized

**Decision:** Use a separate page for creating a return request.

**Why:** A dedicated form provides sufficient space for customer, order, item, reason, and description fields without overcrowding the dashboard.

**Implementation:** Request creation is handled by `POST /api/requests`.

### Decision 03: Manual request entry

**Status:** Finalized

**Decision:** Allow users to enter customer and order/item information manually.

**Why:** The workflow should work without depending on an external order-management integration.

**Implementation:** The backend validates submitted fields before creating a database record.

### Decision 04: Generated reference and navigation after creation

**Status:** Finalized

**Decision:** Generate a unique return reference, display it after successful creation, and return the user to the dashboard.

**Why:** A human-readable reference makes requests easier to identify and communicate about.

**Implementation:** References use the `RET-` prefix followed by a short alphanumeric identifier.

### Decision 05: Request reference format

**Status:** Finalized

**Decision:** Use the `RET-XXXXXX` reference format with six uppercase alphanumeric characters after the prefix.

**Why:** The format is compact, readable, and suitable for displaying and searching requests.

**Implementation:** The creation service generates references, while database uniqueness constraints prevent duplicate references.

### Decision 06: Categorized, chronological, append-only notes

**Status:** Finalized

**Decision:** Support three note categories: Internal Update, Customer Contact, and Decision.

**Why:** Keeping a history of updates and decisions provides traceability and prevents earlier notes from being silently overwritten.

**Implementation:** Notes are stored separately from requests, associated through a database relation, and ordered by creation time. Decision notes are created by the backend during relevant status transitions.

### Decision 07: Controlled status transitions

**Status:** Finalized

**Decision:** Only allow valid transitions through the request lifecycle.

**Why:** Prevent invalid state changes and ensure approval, rejection, and completion follow a consistent workflow.

**Implementation:**

```text
OPEN -> IN_REVIEW -> APPROVED -> COMPLETED
                \-> REJECTED
```

`COMPLETED` and `REJECTED` are terminal states. Invalid transitions are rejected by the backend.

### Decision 08: Resolution-specific refund amount

**Status:** Finalized

**Decision:** Support Refund, Replacement, and Store Credit as resolution types. A refund amount is applicable only to Refund.

**Why:** A monetary amount should not be recorded for a non-monetary resolution.

**Implementation:** The backend validates resolution data and checks refund amounts for positive values and at most two decimal places.

### Decision 09: Non-destructive request removal

**Status:** Finalized

**Decision:** Removal requires a reason and must not permanently delete the request.

**Why:** Preserve an audit trail and distinguish administrative removal from the business lifecycle status.

**Implementation:** The request is marked as removed with removal metadata. Removed requests are excluded from normal listing queries.

### Decision 10: Debounced server-side list operations

**Status:** Finalized

**Decision:** Use a search box with a short debounce delay. Search, filters, sorting, and pagination are executed server-side and work together.

**Why:** Debouncing reduces unnecessary requests while server-side operations provide consistent results across the complete dataset.

**Implementation:** The list API accepts query parameters for search, status, reason, sort field, sort order, page, and page size.

### Decision 11: Relational database schema and activity logging

**Status:** Finalized

**Decision:** Use PostgreSQL with Prisma and store return requests and their notes in separate related tables.

**Why:** Structured data, database constraints, and explicit relations improve consistency and support reliable request history.

**Implementation:** The schema contains `ReturnRequest` and `RequestNote` models, enums, timestamps, resolution fields, removal metadata, and indexes for common queries.

## Request Lifecycle and Business Rules

### Status transitions

| Current status | Allowed next status |
|---|---|
| `OPEN` | `IN_REVIEW` |
| `IN_REVIEW` | `APPROVED`, `REJECTED` |
| `APPROVED` | `COMPLETED` |
| `COMPLETED` | None |
| `REJECTED` | None |

Approval requires a valid resolution. Requests cannot bypass the defined lifecycle.

### Editing restrictions

Customer and item details can be edited while a request is in `OPEN` or `IN_REVIEW`.

Once a request reaches `APPROVED`, `REJECTED`, or `COMPLETED`, detail edits are rejected by the backend.

Notes may still be added after a request reaches a final status, provided the request has not been removed.

### Duplicate active requests

The system prevents more than one active request for the same order and item combination.

A PostgreSQL partial unique index enforces this rule for requests that have not been removed and are not in `COMPLETED` or `REJECTED`.

This database constraint protects against concurrent creation attempts. A completed or rejected request does not block a new request for the same order and item.

### Soft removal

Removal is independent of lifecycle status. It records the removal reason, timestamp, and actor metadata rather than deleting the record.

Removed requests are excluded from normal listing queries and cannot be modified through regular request workflows.

## API Documentation

All endpoints use the `/api` base path.

### Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Check database connectivity |

### Requests

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/requests` | List non-removed requests with server-side search, filters, sorting, pagination, and status counts |
| POST | `/api/requests` | Create a return request |
| GET | `/api/requests/:id` | Retrieve request details and associated notes |
| PATCH | `/api/requests/:id` | Update editable request details or perform a valid status transition |
| POST | `/api/requests/:id/notes` | Add a categorized note |
| PATCH | `/api/requests/:id/remove` | Soft-remove a request with a reason |

There is no separate `GET /api/requests/:id/notes` endpoint. Request notes are returned as part of `GET /api/requests/:id`.

### List query parameters

- `search`: Case-insensitive search across `reference`, `customerName`, `customerEmail`, and `orderId`.
- `status`: Filter by request status.
- `reason`: Filter by return reason.
- `sortBy`: Select an allowed sort field: `createdAt`, `updatedAt`, `customerName`, `status`, or `reference`.
- `sortOrder`: Select `asc` or `desc`.
- `page`: Page number. Defaults to `1`.
- `limit`: Number of records per page. Defaults to `10`, with a maximum of `100`.

Example:

```http
GET /api/requests?status=OPEN&reason=DEFECTIVE&sortBy=createdAt&sortOrder=desc&page=1&limit=10
```

### Create a request

Example request body:

```json
{
  "customerName": "Test Customer",
  "customerEmail": "test.customer@example.com",
  "orderId": "ORD-TEST-001",
  "itemId": "ITEM-TEST-001",
  "itemName": "Wireless Headphones",
  "reason": "DEFECTIVE",
  "description": "The headphones do not power on."
}
```

A successful creation returns `201 Created` and includes the generated reference.

### Add a note

Example request body:

```json
{
  "category": "INTERNAL_UPDATE",
  "content": "Checked the issue with the warehouse team."
}
```

Supported regular note categories are:

- `INTERNAL_UPDATE`
- `CUSTOMER_CONTACT`

Decision notes are created automatically by the backend during approval and rejection transitions.

The backend assigns the note author as `Operations Agent`. Any `author` value sent by the client is ignored.

### Soft-remove a request

Example request body:

```json
{
  "reason": "Created by mistake during testing"
}
```

The backend records the removal metadata instead of physically deleting the request.

### HTTP response conventions

| Status code | Meaning |
|---|---|
| `200` | Successful retrieval or update |
| `201` | Request successfully created |
| `400` | Invalid input or malformed request |
| `404` | Request not found |
| `409` | Duplicate request or lifecycle conflict |
| `500` / `503` | Unexpected server or service failure, depending on the endpoint |

Response bodies and error codes depend on the endpoint implementation. Errors should not expose stack traces or sensitive database details.

## Database Design

### ReturnRequest

Stores the return reference, customer information, order and item details, reason, description, status, resolution, timestamps, and soft-removal metadata.

Important constraints and indexes include:

- Unique request reference.
- Status and removal-state index for dashboard queries.
- Order/item lookup index.
- Customer and reason indexes.
- Partial unique index preventing duplicate active order/item requests.

### RequestNote

Stores the associated request ID, category, content, author, and creation timestamp.

Notes reference their parent request through a foreign key and are intended to remain append-only during normal application use.

## Seed Data

The development database has been seeded with 30 return requests and associated notes.

The seed dataset covers different lifecycle statuses and return reasons so that dashboard counts, filtering, pagination, and request-detail workflows can be tested without manually creating every record.

The seed command is:

```bash
npm run prisma:seed
```

The seed script checks for existing seed records before inserting data and does not create duplicate seed records when rerun.

## Validation and Testing

The following request-creation checks have been reported as passing during manual testing:

- Valid request creation.
- Duplicate active request rejection.
- Required-field and email validation.
- Invalid reason rejection.

Additional backend checks should cover:

- Every permitted and forbidden status transition.
- Missing or invalid resolution data.
- Refund amount boundaries.
- Detail-edit restrictions after a final decision.
- Adding notes to completed and rejected requests.
- Soft removal and subsequent request creation.
- Combined search, filtering, sorting, and pagination.
- Nonexistent IDs and malformed JSON.
- Concurrent creation and concurrent edit/status-update attempts.

Manual tests do not replace automated tests or deployment checks. Only mark additional cases as passed after running them.

## Assumptions and Limitations

- Customer, order, and item information is entered manually; no external order-system integration is assumed.
- Actor fields should be connected to authenticated users before production use.
- The system enforces a defined lifecycle rather than allowing arbitrary status changes.
- Soft removal preserves records; recovery functionality and a dedicated removal-history UI are not assumed unless implemented.
- Authentication, authorization, automated integration tests, and deployment-specific operational checks must be reviewed against the final implementation.
- Production readiness is not claimed solely on the basis of local manual tests.

## Local Development

### Prerequisites

- Node.js and npm
- PostgreSQL database, such as a Supabase PostgreSQL project

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root and configure the database connection expected by `prisma.config.ts`.

```env
DB_URL="your_postgresql_connection_string"
```

Use your actual PostgreSQL connection string. Never commit `.env` or expose database credentials in the repository.

### 3. Generate the Prisma client

```bash
npx prisma generate
```

### 4. Apply database migrations

For local development:

```bash
npx prisma migrate dev
```

Review migrations before applying them to any shared or production database.

### 5. Seed the database

The configured seed script is:

```json
"prisma:seed": "node prisma/seed.js"
```

Run it using:

```bash
npm run prisma:seed
```

Only run the seed command against a database where development sample data is appropriate.

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Implementation Status

The core backend routes, database schema, request lifecycle rules, duplicate prevention, notes, soft removal, and seed data have been implemented.

The dashboard to see all returning request amd to add new return request is done
````
