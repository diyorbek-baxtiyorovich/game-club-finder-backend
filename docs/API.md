# GameClubFinder API v1

Base path: `/api/v1`. Requests and responses use JSON unless an endpoint accepts or returns an image. Successful JSON responses use `{ "success": true, "data": ... }`; paginated responses may also include `meta`. Errors use `{ "error": { "code", "message", "requestId", "details?" } }`. Validation messages are Uzbek.

Authentication uses `Authorization: Bearer <accessToken>`. Access tokens expire after 15 minutes; refresh tokens after 30 days. Public endpoints are marked **Public**. `user`, `club_owner`, and `admin` are application roles; owner access is also checked against the target club.

## Endpoints

| Method and path | Access | Purpose and input |
|---|---|---|
| `GET /api/health` | Public | Database health; returns `{ "status": "ok" }` when the database check passes. |
| `GET /games` | Public | Game catalog. |
| `GET /games/popular` | Public | Popular games catalog. |
| `POST /auth/telegram` | Public, 10 requests / 15 min | Body `{ "initData": "..." }`; verifies Telegram Mini App data and returns user plus access/refresh tokens. |
| `POST /auth/refresh` | Public, 20 requests / 15 min | Body `{ "refreshToken": "..." }`; rotates the refresh token. |
| `POST /auth/logout` | Public, 20 requests / 15 min | Body `{ "refreshToken": "..." }`; revokes its token family. |
| `GET /users/me` | Authenticated | Current token user. |
| `GET /clubs` | Public | Query: `q`, `city`, `page`, `limit` (1–100), `sort` (`newest`, `name`, `price_low`, `price_high`). Lists approved active clubs. |
| `GET /clubs/nearby` | Public | `lat` and `lng` together with optional `radius` (1–50,000 m), or `city`; returns approved active clubs. |
| `GET /clubs/:id` | Public; optional token | Full public club profile; authenticated reads can record view history. |
| `POST /clubs` | `club_owner` or `admin` | Creates a pending club. Body includes name, slug, address, `{lng,lat}` and optional equipment, features, pricing, images, gameIds, workingHours, timezone. |
| `PUT /clubs/:id` | `club_owner` or `admin`; object ownership checked | Updates supplied club fields. An `images` array replaces only URL-based images; uploaded images are kept. |
| `DELETE /clubs/:id` | `club_owner` or `admin`; object ownership checked | Soft-deletes the club. |
| `GET /clubs/:id/availability` | Public | Current open state and timezone; occupancy is `unknown` until a live source is connected. |
| `GET /clubs/:id/stats` | Club owner or admin; owner limited to own club | Club views, unique viewers, favorites, and public rating summary. |
| `POST /clubs/:id/images` | Club owner; owner checked | Uploads JPEG, PNG, or WebP bytes. Headers: matching `Content-Type`, `X-Media-Category` (`cover`, `interior`, `equipment`), optional `X-Display-Order`. Max 8 MiB. |
| `DELETE /clubs/:id/images/:imageId` | Club owner; owner checked | Deletes one club image (row and uploaded file). Returns 204. |
| `GET /media/:id` | Public | Reads an image belonging to a public active club. |
| `GET /clubs/:id/reviews` | Public | Lists public, approved reviews for a club. |
| `POST /clubs/:id/reviews` | Authenticated `user` | Creates a review with six integer 1–5 ratings and text; submitted for moderation. |
| `PUT /reviews/:id` | Authenticated author | Updates own review; it returns to moderation. |
| `DELETE /reviews/:id` | Authenticated author | Deletes own review and its rating contribution. |
| `POST /reviews/:id/reply` | Club owner | Creates or updates the owner's reply to an approved review. |
| `POST /reviews/:id/helpful` | Authenticated user | Adds one helpful vote; duplicate votes do not increase the count. |
| `GET /favorites` | Authenticated | Paged current user's favorites. |
| `POST /favorites/:clubId` | Authenticated | Adds an eligible public club to favorites. |
| `DELETE /favorites/:clubId` | Authenticated | Removes a favorite. |
| `GET /history` | Authenticated | Current user's recent club view history. |
| `GET /filters/options` | Public | Catalog-backed search filter choices and supported ranges. |
| `POST /search` | Public | JSON filters: `q`, `city` or `location` (`lat`, `lng`, `radiusMeters`), `ratingMin`, `games`, `hardware`, `roomTypes`, `services`, `price`, `openNow`, pagination, and sort. City and coordinates cannot be combined. |
| `GET /clubs/:id/status` | Club owner or admin; owner checked | Reads own club submission status. |
| `GET /admin/stats` | Admin | Admin overview aggregates. |
| `GET /admin/audit` | Admin | Audit events; optional `limit` from 1 to 100. |
| `GET /admin/clubs/pending` | Admin | Paged pending club queue. |
| `PATCH /admin/clubs/:id/status` | Admin | Approves or rejects a club; rejection requires a reason. |
| `PATCH /admin/reviews/:id/status` | Admin | Approves, rejects, or flags a review. |

All paths above are relative to `/api/v1`, except `/api/health`. Unknown routes return a localized 404. Invalid request data returns 400; unauthenticated requests return 401; role/ownership failures return 403; unavailable or hidden public resources return 404. Rate-limited authentication requests return 429.

## Versioning and change control

The backend v1 contract is frozen under `/api/v1`; incompatible changes require a new prefix. This document and `openapi.yaml` are the contract source for frontend integration, and existing response shapes should remain stable within v1. The adjacent frontend project currently binds its club repository to mock data and has no HTTP adapter, so there are no live frontend request/response shapes to reconcile yet. Frontend integration can use this frozen contract as its target.

## Verification

See the README section **Testlar** for preparing a disposable local PostgreSQL/PostGIS database and running unit, integration, and build checks. Integration tests write temporary fixtures and clean them up; append-only audit records generated by tested state changes are retained.
