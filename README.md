# ReturnDesk — Pratyayati Ops

A return request management system for creating, reviewing, approving, tracking, and soft-removing customer return requests through a controlled lifecycle.

## Overview

Pratyayati Ops provides an operations dashboard for managing return requests. It supports:

- Request creation
- Automatically generated request references
- Server-side search, filtering, sorting, and pagination
- Controlled request status transitions
- Refund, replacement, and store-credit resolutions
- Chronological activity notes
- Duplicate active-request prevention
- Backend editing restrictions after decisions
- Non-destructive request removal
- PostgreSQL persistence through Prisma

## Technology Stack

- Next.js App Router
- React
- JavaScript and JSX
- Tailwind CSS
- Next.js Route Handlers
- PostgreSQL
- Supabase PostgreSQL
- Prisma 7
- `@prisma/adapter-pg`

## Architecture

```text
React UI
   |
   v
Next.js App Router
   |
   +-- Dashboard
   +-- Request creation page
   +-- Request details page
   +-- Client API helpers
   |
   v
Next.js Route Handlers
   |
   +-- Request validation
   +-- Business logic
   +-- Status and lifecycle rules
   +-- Duplicate-request checks
   +-- Notes
   +-- Soft removal
   |
   v
Prisma ORM
   |
   v
PostgreSQL / Supabase
Main Features
- Create return requests with manually entered customer, order, and item information.
- Generate a unique human-readable request reference.
- View status counts on the dashboard.
- Search by reference, customer, customer email, or order ID.
- Filter by status and return reason.
- Sort and paginate requests on the server.
- Open a dedicated Request Details page.
- Move requests through the allowed lifecycle.
- Approve requests with a required resolution type.
- Require a valid refund amount for refund resolutions.
- Add categorized activity notes.
- Automatically create decision notes during approval and rejection.
- Prevent duplicate active requests for the same order and item.
- Prevent editing customer and item details after a final decision.
- Soft-remove eligible requests while retaining their database records and notes.
- Exclude removed requests from normal operational views.
Project Structure
src/
├── app/
│   ├── api/
│   │   ├── health/
│   │   │   └── route.js
│   │   └── requests/
│   │       ├── route.js
│   │       ├── service.js
│   │       ├── validation.js
│   │       └── [id]/
│   │           ├── route.js
│   │           ├── notes/
│   │           │   └── route.js
│   │           └── remove/
│   │               └── route.js
│   ├── requests/
│   │   ├── [id]/
│   │   │   └── page.js
│   │   └── new/
│   │       └── page.js
│   ├── globals.css
│   ├── layout.js
│   └── page.js
├── components/
│   ├── dashboard/
│   ├── layout/
│   ├── requests/
│   └── ui/
└── lib/
    ├── db.js
    └── requests.js

prisma/
├── migrations/
├── schema.prisma
└── seed.js
Request Lifecycle
The backend enforces the following transitions:
OPEN
  |
  v
IN_REVIEW
  |        \
  v         v
APPROVED  REJECTED
  |
  v
COMPLETED
Current status	Allowed next status
OPEN	IN_REVIEW
IN_REVIEW	APPROVED, REJECTED
APPROVED	COMPLETED
COMPLETED	None
REJECTED	None


COMPLETED and REJECTED are final states.

Invalid transitions, such as OPEN to APPROVED or OPEN to COMPLETED, are rejected by the backend.

The frontend displays only actions valid for the current status. The backend remains the final authority.
Approval and Resolution Rules
Supported resolution types:
REFUND
REPLACEMENT
STORE_CREDIT
Rules:
- A request cannot be approved without a valid resolution.
- REFUND requires an amount greater than zero.
- Refund amounts may contain at most two decimal places.
- REPLACEMENT must not include a refund amount.
- STORE_CREDIT must not include a refund amount.
- Invalid resolution data is rejected by the backend.
Refund approval payload
{
  "status": "APPROVED",
  "resolutionType": "REFUND",
  "refundAmount": "499.00"
}
Replacement approval payload
{
  "status": "APPROVED",
  "resolutionType": "REPLACEMENT"
}
Store-credit approval payload
{
  "status": "APPROVED",
  "resolutionType": "STORE_CREDIT"
}
When a request is approved or rejected, the backend automatically creates a DECISION activity note.
Return Reasons
The implementation supports these return reason values:
DEFECTIVE
WRONG_ITEM
NOT_AS_DESCRIBED
NO_LONGER_NEEDED
DELIVERY_ISSUE
OTHER
API value	Display label
DEFECTIVE	Defective
WRONG_ITEM	Wrong item
NOT_AS_DESCRIBED	Not as described
NO_LONGER_NEEDED	No longer needed
DELIVERY_ISSUE	Delivery issue
OTHER	Other


Request Creation
Endpoint:
POST /api/requests
Example request body:
{
  "customerName": "Test Customer",
  "customerEmail": "test.customer@example.com",
  "orderId": "ORD-TEST-001",
  "itemId": "ITEM-TEST-001",
  "itemName": "Wireless Headphones",
  "reason": "DEFECTIVE",
  "description": "The headphones do not power on."
}
Required fields:
- customerName
- customerEmail
- orderId
- itemId
- itemName
- reason
- description
The backend validates required fields, trimmed values, email format, supported return reasons, and duplicate active requests.

A successful request creation returns HTTP 201 and includes the generated request reference.
Reference Generation
References are generated by the backend and are never entered manually.

Format:
RET-XXXXXX
XXXXXX contains six uppercase alphanumeric characters.

Example:
RET-A1B2C3
The database enforces reference uniqueness.
Duplicate Active Requests
Only one active request is allowed for the same:
orderId + itemId
A request is active when:
isRemoved = false
status is not COMPLETED
status is not REJECTED
Therefore, requests in these statuses block another request for the same order and item:
- OPEN
- IN_REVIEW
- APPROVED
A new request is allowed after the earlier request:
- Reaches COMPLETED
- Reaches REJECTED
- Is soft-removed
The database contains a partial unique index:
CREATE UNIQUE INDEX unique_active_return_request_per_order_item
ON "ReturnRequest" ("orderId", "itemId")
WHERE "isRemoved" = false
  AND status NOT IN ('COMPLETED', 'REJECTED');
Request Details
Request details are available at:
/requests/[id]
The details page displays:
- Request reference
- Current status
- Customer name
- Customer email
- Order ID
- Item ID
- Item name
- Return reason
- Full description
- Created timestamp
- Last-updated timestamp
- Resolution type
- Refund amount when present
- Chronological activity notes
Editing Restrictions
The backend allows customer, order, item, reason, and description updates while a request is:
- OPEN
- IN_REVIEW
After a request reaches one of the following statuses, these details cannot be edited:
- APPROVED
- REJECTED
- COMPLETED
The current frontend implementation focuses on viewing request details, status actions, notes, and removal. Backend detail-update validation is implemented in the request details route.
Activity Notes
Notes are stored in a separate RequestNote table and associated with the parent request.

Notes are:
- Chronological
- Append-only
- Never edited through the regular workflow
- Never deleted through the regular workflow
- Available throughout the request lifecycle
- Preserved when a request is soft-removed
Stored note categories
INTERNAL_UPDATE
CUSTOMER_CONTACT
DECISION
API value	Display label
INTERNAL_UPDATE	Internal Update
CUSTOMER_CONTACT	Customer Contact
DECISION	Decision


User-created notes
Regular user-created notes support:
INTERNAL_UPDATE
CUSTOMER_CONTACT
Endpoint:
POST /api/requests/[id]/notes
Example payload:
{
  "category": "INTERNAL_UPDATE",
  "content": "Checked the issue with the warehouse team."
}
The backend:
- Validates the note category.
- Requires non-empty content.
- Trims leading and trailing whitespace.
- Limits content to 2,000 characters.
- Assigns the author as Operations Agent.
- Rejects notes for removed requests.
The frontend provides:
- Category selection
- Required note content
- Character counter
- Loading state
- Duplicate-submit prevention
- Success feedback
- API and network error feedback
- Form preservation after failed submission
- Server refresh after successful submission
Decision notes
DECISION notes are generated automatically by the backend during:
- Approval
- Rejection
They are not manually selectable in the regular Add Note form.
Request Removal
Request removal is implemented as a soft delete.

Endpoint:
PATCH /api/requests/[id]/remove
Example payload:
{
  "reason": "Created by mistake during testing"
}
Removal is permitted only for:
- OPEN
- REJECTED
Removal is refused for:
- IN_REVIEW
- APPROVED
- COMPLETED
For an ineligible request, the backend returns HTTP 409 Conflict:
{
  "success": false,
  "error": {
    "code": "REQUEST_REMOVAL_NOT_ALLOWED",
    "message": "Only open or rejected requests can be removed."
  }
}
The request status eligibility condition is included in the atomic database update. This prevents a request from being removed if it becomes ineligible between checking and updating.
Removal metadata
The backend records:
- isRemoved
- removedAt
- removedBy
- removalReason
The request and its notes are not physically deleted.
Removal frontend behavior
The details page:
- Shows the Remove Request action only for OPEN and REJECTED.
- Opens a custom accessible React modal.
- Requires a non-empty removal reason.
- Trims the reason before sending.
- Limits the reason to 500 characters.
- Shows a character counter.
- Prevents duplicate submissions.
- Prevents dismissal while removal is in progress.
- Supports Cancel, backdrop dismissal, and Escape-key dismissal while idle.
- Displays API and network errors inside the modal.
- Navigates back to the dashboard after successful removal.
Removed request behavior
Removed requests:
- Remain in PostgreSQL.
- Retain their notes.
- Are excluded from dashboard results.
- Are excluded from status counts.
- Return 404 REQUEST_NOT_FOUND from the regular details endpoint.
- Cannot receive new notes.
- Do not block a new request for the same order and item.
API Endpoints
Health
GET /api/health
Request collection
GET /api/requests
POST /api/requests
The list endpoint supports:
search
status
reason
sortBy
sortOrder
page
limit
Request details and lifecycle
GET /api/requests/[id]
PATCH /api/requests/[id]
The PATCH endpoint supports request detail updates and status transitions according to the backend rules.
Notes
POST /api/requests/[id]/notes
Removal
PATCH /api/requests/[id]/remove
Response and Error Conventions
Successful responses use the following general shape:
{
  "success": true
}
Error responses use:
{
  "success": false,
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human-readable error message."
  }
}
Common status codes:
Status	Meaning
200	Successful retrieval or update
201	Request or note successfully created
400	Invalid input or malformed JSON
404	Request not found or removed
409	Duplicate request or lifecycle/removal conflict
500	Unexpected server error


The backend does not return stack traces or sensitive database details to clients.
Database Design
ReturnRequest
Stores:
- Request ID
- Unique reference
- Customer information
- Order and item information
- Return reason
- Description
- Request status
- Resolution data
- Decision metadata
- Removal metadata
- Creation and update timestamps
Important fields:
id
reference
customerName
customerEmail
orderId
itemId
itemName
reason
description
status
resolutionType
refundAmount
decisionAt
decidedBy
isRemoved
removedAt
removedBy
removalReason
createdAt
updatedAt
RequestNote
Stores:
id
requestId
category
content
author
createdAt
Notes reference their parent request through a foreign-key relation. Normal request operations do not delete notes.
Seed Data
The seed script is:
prisma/seed.js
Run it with:
npm run prisma:seed
The seed script:
- Creates 30 sample return requests.
- Covers every supported status.
- Covers every supported return reason.
- Creates activity notes.
- Creates decision notes for decided requests.
- Uses references beginning with RET-SEED-.
- Checks whether seed data already exists before inserting.
The seed script is intended for a development database.

The current database may contain additional manually created test or verification records in addition to the 30 seed records.
Environment Configuration
Create a .env file in the project root:
DB_URL="your_postgresql_connection_string"
DB_URL is used by the Prisma client and seed script.

Do not commit .env or expose database credentials.
Local Development
Prerequisites
- Node.js
- npm
- PostgreSQL
- Supabase PostgreSQL or another PostgreSQL provider
Install dependencies
npm install
Generate Prisma Client
npx prisma generate
Apply migrations
For local development:
npx prisma migrate dev
Review migrations before applying them to a shared or production database.
Seed the database
npm run prisma:seed
Only run the seed command against a database where development sample data is appropriate.
Start the application
npm run dev
Open:
http://localhost:3000
Production Deployment
Configure DB_URL in the hosting provider's environment variables.

Apply committed migrations with:
npx prisma migrate deploy
Do not run prisma migrate dev against a production database.

After deployment, verify:
- /api/health
- Dashboard loading
- Request creation
- Request details
- Status transitions
- Resolution handling
- Notes
- Removal rules
- Database persistence
Do not seed production unless sample data is explicitly required.
Validation Performed
The following checks were executed during development:
- Dashboard loading
- Request details loading
- Request creation validation
- Duplicate active-request handling
- Status transition validation
- Resolution validation
- Notes creation and error handling
- Removed-request filtering
- Removed-request details returning 404
- Notes rejected for removed requests
- Reuse of the same order/item after removal
- Removal checks for all five statuses
- Custom removal modal browser checks
- npm run lint
- npm run build
Removal status testing produced the following results:
Status	Result
OPEN	Removal succeeded
REJECTED	Removal succeeded
IN_REVIEW	Refused with HTTP 409
APPROVED	Refused with HTTP 409
COMPLETED	Refused with HTTP 409


The current database may contain test records created during manual verification. These are separate from the 30 seed records.

The deployed application was also inspected manually. The deployed dashboard and request details pages loaded successfully, but the deployed database contained additional verification records. Production mutation testing should be performed only against a controlled database.
Known Limitations
- Authentication is not implemented.
- Role-based authorization is not implemented.
- Actor values such as Operations Agent are fixed values rather than authenticated users.
- Removed-request recovery is not implemented.
- There is no dedicated removal-history interface.
- Automated unit and integration test suites have not been added.
- The AI support assistant is not implemented.
- The deployment database may contain manual verification records in addition to seeded records.
- Production mutation testing should be performed carefully against a controlled database.
- Mobile layout should be checked on actual devices and browsers, especially around the notes form at 375px width.
Future Improvements
- Add authentication and role-based authorization.
- Associate removedBy, decidedBy, and note authors with authenticated users.
- Add automated API and integration tests.
- Add a removed-request audit view.
- Add controlled recovery for removed requests if required.
- Expand concurrent-operation test coverage.
- Add production monitoring and structured logging.
- Improve mobile layout validation across real devices and browsers.
Implementation Status
Implemented
- Dashboard
- Server-side search
- Server-side filtering
- Server-side sorting
- Server-side pagination
- Request creation
- Generated request references
- Request details page
- Status transitions
- Resolution handling
- Refund validation
- Categorized notes
- Chronological append-only notes
- Automatic decision notes
- Duplicate active-request prevention
- Detail-edit restrictions in the backend
- Soft removal
- Status-based removal eligibility
- Removal metadata preservation
- Removed-request filtering
- Custom removal modal
Not implemented
- Authentication
- Authorization
- Automated test suite
- Removed-request recovery
- AI support assistant
- Dedicated removal-history UI

## Rough Estimate Development Time

| Task | Estimated time |
|---|---:|
| Understanding requirements (reading the requirements first and then working through them with AI) | 1 hour |
| Project setup (new to Next.js) | 45 minutes |
| Database design | 30 minutes |
| Deciding API endpoints | 30 minutes |
| Controller implementation — first phase | 1 hour |
| Controller implementation — second phase | 2 hours |
| Frontend development | 2.5 hours |
| Additional implementation work | 1 hour |
| **Total estimated time** | **9 hours 15 minutes** |
