# GameClubFinder — API va database ma’lumotnomasi

> **Zaruratda ochiladigan fayl.** Manbadagi endpoint va migratsiya tafsilotlari.

# 5. API endpointlar nazorat ro‘yxati

**Belgilar:** `[TZ]` — asl `BACKEND(1).md`da bor; `[TAVSIYA]` — ushbu ish rejasiga qo‘shilgan. Oldindan mavjudligi tasdiqlanmagan yangi endpointlar ishlab chiqish jarayonida kelishiladi.

| Yo‘l | Modul | Bosqich | Kelib chiqishi |
|---|---|---:|---|
| `GET /api/health` | common | 01 | Hozirgi backend karkasi |
| `POST /api/v1/auth/telegram` | auth | 05 | TZ |
| `POST /api/v1/auth/refresh` | auth | 06 | TZ |
| `POST /api/v1/auth/logout` | auth | 06 | TZ |
| `GET /api/v1/users/me` | users | 06 | TAVSIYA |
| `GET /api/v1/games` | catalogs | 04 | TZ |
| `GET /api/v1/games/popular` | catalogs | 04 | TZ |
| `GET /api/v1/clubs` | clubs/discovery | 07/11 | TZ |
| `GET /api/v1/clubs/nearby` | discovery | 10 | TZ |
| `GET /api/v1/clubs/:id` | clubs | 07/08 | TZ |
| `POST /api/v1/clubs` | clubs | 07 | TZ |
| `PUT /api/v1/clubs/:id` | clubs | 07/08 | TZ |
| `DELETE /api/v1/clubs/:id` | clubs | 07 | TZ |
| `POST /api/v1/search` | discovery | 11 | TZ |
| `GET /api/v1/filters/options` | catalogs | 11 | TZ |
| `GET /api/v1/favorites` | favorites | 12 | TZ |
| `POST /api/v1/favorites/:clubId` | favorites | 12 | TZ |
| `DELETE /api/v1/favorites/:clubId` | favorites | 12 | TZ |
| `GET /api/v1/history` | history | 12 | TZ |
| `GET /api/v1/clubs/:id/reviews` | reviews | 13 | TZ |
| `POST /api/v1/clubs/:id/reviews` | reviews | 13 | TZ |
| `PUT /api/v1/reviews/:id` | reviews | 13 | TZ |
| `DELETE /api/v1/reviews/:id` | reviews | 13 | TZ |
| `POST /api/v1/reviews/:id/reply` | reviews | 13 | TZ |
| `POST /api/v1/reviews/:id/helpful` | reviews | 13 | TZ |
| `GET /api/v1/clubs/:id/availability` | clubs | 15 | TZ — live bandlik emas |
| `GET /api/v1/admin/clubs/pending` | moderation | 09 | TAVSIYA |
| `PATCH /api/v1/admin/clubs/:id/status` | moderation | 09 | TAVSIYA |

---

# 6. Database migratsiya tartibi va xavfli joylar

**Ehtimoliy migratsiya ketma-ketligi** (fayl nomlarini migratsiya vositasining real formatiga mosla):

```text
001_enable_postgis
002_create_users
003_create_auth_sessions            # JWT refresh saqlash tanlansa
004_create_games
005_create_game_clubs
006_create_club_equipment_and_features
007_create_club_pricing_and_images
008_create_club_games               # games va game_clubs dan keyin
009_create_moderation_audit
010_create_favorites_and_history
011_create_ratings_and_reviews
012_create_review_replies_and_helpful_votes
013_add_extra_constraints_and_indexes
```

**Manba bazadan kelib chiqadigan tekshiruvlar:**

1. `club_games` `games`ga FK qilmoqda — games avval yaratiladi.
2. `users.telegram_id BIGINT` — JavaScript `number` aniqlik chegarasini hisobga ol; pg'ning `BIGINT` qaytarish xususiyatini tekshir, API ID tiplari izchil bo‘lsin.
3. `game_clubs.location GEOGRAPHY(POINT,4326)` — latitude/longitude joylashuvini adashtirma.
4. Indeks `GIST(location)`, keyingi katta qidiruvlarda `EXPLAIN ANALYZE` bilan tekshiriladi.
5. `club_equipment` va `club_features`ga bitta club uchun bittadan satr bo‘lishi kerak bo‘lsa `UNIQUE(club_id)` qo‘shish qarori talab etiladi.
6. Rating trigger manbada INSERT/UPDATE uchun yozilgan; DELETE, moderatsiya, club rating yozuvlarining o‘chishi va bir clubga tegishlilikni tekshir.
7. `reviews.rating_id` va `reviews.club_id` bir clubga tegishlimi — service yoki DB constraint bilan tekshir.
8. `review_replies`da owner/admin ruxsati, `helpful`da bir kishining takror ovozi masalasi ochiq.
9. `working_hours` uchun JSON sxemasi va vaqt mintaqasi ochiq.
10. Migrations productionda eski ma’lumotlarni buzmasligi kerak; nolga tushirish (drop/reseed) faqat lokal test bazada.

---
