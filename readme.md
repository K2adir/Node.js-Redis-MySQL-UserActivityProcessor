## Submission Notes
I'm submitting the same codebase in two styles: modular (my personal preference) and monolith (single file for submission). The instructions didn't specify restrictions on architecture changes or external libraries, so I assumed some are allowed (Nodemon for development). I avoided non-essential libs like ZOD (validation) or axios-retry (time-outs), I implemented custom validation and retry logic manually.

Modular Codebase (modular-codebase/): Structured with folders for routes, services, and utils—better for maintainability and testing.

Monolith Codebase (monolith-codebase/): All logic combined into one file (app.js) for a direct comparison to the original, while keeping the improvements.

Both versions share the same functionality and can use the root node_modules.

## To run the project from the root.
 install deps at the root folder.
 
 `npm install`
 
 to run
- `npm run dev:modular`

 or
- `npm run dev:mono`


### 1. Identify the Key Issues in the Current Implementation

- **Validation is minimal** and happens inline per activity. One bad item terminates processing for the entire batch.
- **Inefficient processing**: All DB, Redis, and external service operations are handled individually in a loop.
- **No batching**: Multiple redundant connections and operations increase I/O load.
- **Redis updates are non-atomic** (`get → modify → set`) which introduces race conditions.
- **No failure isolation**: A single Redis or external service failure can crash the entire request.
- **Callback-based MySQL access**: Error-prone and harder to reason about.
- **No retry logic** for external service communication.
- **No DDOS protection or batch size limits**.
- **Tight coupling and no separation of concerns**.

---

### 2. Proposed and Implemented Improvements

- Centralized, reusable activity validation.
- Added a batch size limit to guard against large inputs.
- Batched MySQL inserts inside a transaction using a connection pool.
- Redis updates grouped using `multi.hIncrBy()` for atomic operations.
- Added `Promise.allSettled()` for notification dispatching to prevent one failure from blocking others.
- Retry logic with timeout added to external HTTP calls.
- Split logic into modular files: `routes/`, `services/`, `utils/`.
- Environment variables loaded using `.env` with fallbacks.
- Return proper status codes: `400`, `413`, `207`, `500`.
- Provide detailed feedback on partial failures (e.g., Redis or HTTP errors).

---

### 3. Explanation of Major Changes

- **Validation**:
  - Moved into `validateActivity.js`.
  - Allows structured feedback for all failed items rather than failing fast.
  - Promotes reusability and testability.

- **Batching**:
  - MySQL batch insert cuts down on DB calls and uses transactions to avoid partial state.
  - Redis `multi` command ensures grouped atomic counter updates.
  - Notifications handled in parallel and isolated to prevent cascade failures.

- **Error Handling**:
  - Each layer (DB, Redis, HTTP) is wrapped in `try/catch` blocks.
  - Failures are logged with timestamps.
  - `207 Multi-Status` is returned when partial success is possible.

- **Code Organization**:
  - All responsibilities are clearly separated:
    - Validation → `utils/validateActivity.js`
    - Database logic → `services/db.js`, `insertActivities.js`
    - Redis logic → `services/updateUserStats.js`
    - Notification → `services/notifyExternalService.js`
    - API routing → `routes/userActivity.js`
  - Main app bootstrapping and health checks in `app.js`.

---

### 4. Edge Cases and Failure Scenarios Handled

- Invalid activities are reported with index and reason.
- Large request payloads are rejected early (`413` status).
- Redis errors are isolated per activity and reported.
- Notification failures do not stop DB or Redis logic.
- Redis initialization is properly awaited to prevent race conditions.
- Timeout and retry applied to external HTTP calls.
- Transaction rollback ensures DB consistency on write failure.
- Timestamped logs help trace issues in production.

---

## Summary

The refactored service is now more:

- Modular and testable
- Scalable and performant
- Fault-tolerant with graceful degradation
- Transparent with rich error reporting

Designed with production-readiness and maintainability in mind.

