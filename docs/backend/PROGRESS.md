# GameClubFinder Backend — Jarayon va natijalar

> **Joriy bosqich:** `18`
> **Umumiy holat:** `18 IN PROGRESS` — Docker/Compose, CI va operatsion sozlamalar amalda tekshirildi; haqiqiy domen/TLS sertifikati, production deploy hamda monitoring provayderi berilmagani uchun production qabul bosqichi ochiq.
> **Qoidalar:** faqat testdan o‘tgan bosqich `DONE`; nima ishlamagani aniq yoziladi.
> **Qo‘shimcha API hujjati ishi:** `/api/docs` Swagger UI mavjud `docs/openapi.yaml`ga ulandi. CDN kutubxonasi brauzer internetini talab qiladi. Typecheck, lint, build, route testi va lokal `GET /games` Swagger “Try it out” → 200 PASS; to‘liq test suite bu ishda NOT RUN. 18-bosqich production qabul holati o‘zgarmadi.
> **Swagger tartibi:** 35 ta operatsiya 14 ta nomlangan bo‘limga ajratildi va endpoint sarlavhalari o‘zbekchalashtirildi. OpenAPI parse testi PASS; har bir operatsiyada e’lon qilingan tag borligi tekshirildi; brauzerda `default` bo‘limi o‘rniga alohida sarlavhalar ko‘ringani PASS.

## Bosqichlar

| № | Vazifa | Holat | Yakuniy izoh |
|---|---|---|---|
| [00](steps/00.md) | Mavjud loyihani tekshirish | DONE | `npm install` va build PASS; dev 3137-portda PASS, 3000-port band. |
| [01](steps/01.md) | Ishlaydigan TypeScript server | DONE | Dev/build/start va `GET /api/health` PASS. |
| [02](steps/02.md) | Umumiy arxitektura, log va xatolar | DONE | Zod, Pino, Helmet; 404/400/500 va ENV testlari PASS. |
| [03](steps/03.md) | PostgreSQL + PostGIS va migration | DONE | Migration 1 ta qo‘llandi; DB check, PostGIS, typecheck/build va 12 test PASS. |
| [04](steps/04.md) | Users bazasi va Games katalogi | DONE | Games migration va seed PASS; ro‘yxat/popular endpointlari 5 ta unikal o‘yin qaytardi; users/me token auth kelguncha ochilmagan. |
| [05](steps/05.md) | Telegram Mini App autentifikatsiyasi | DONE | HMAC/timestamp, user upsert va role migration PASS; Telegram bot tokenni `.env`ga sozlash qoladi. |
| [06](steps/06.md) | JWT, refresh token, RBAC va obyekt ruxsatlari | DONE | Access JWT 15 daqiqa; refresh 30 kun, DB’da hash, rotatsiya/reuse bekor qilish; owner policy va rate limit testlari PASS. |
| [07](steps/07.md) | Clubs asosiy CRUD | DONE | Clubs migration va CRUD; ownership, public visibility, slug, koordinata va soft-delete integratsiya testlari PASS. |
| [08](steps/08.md) | Club ichki ma’lumotlari | DONE | Equipment/features, pricing, images, games va ish vaqti; profil ko‘p jadval transaction’i bilan saqlanadi. |
| [09](steps/09.md) | Club moderatsiyasi | DONE | Admin pending queue/approve/reject, audit va egaga status ko‘rsatish PASS. Resubmission siyosati OPEN. |
| [10](steps/10.md) | PostGIS yordamida yaqin clublarni topish | DONE | 1/5/10 km radius, lng/lat, city fallback, approved/active filtri va GiST indeks tekshirildi. |
| [11](steps/11.md) | Qidiruv va keng filtrlar | DONE | `GET /clubs` q/city/sort, `POST /search`, filter options, `club_ratings` agregati va Asia/Tashkent `openNow`; barcha filter edge testlari PASS. |
| [12](steps/12.md) | Favorites va ko‘rish tarixi | DONE | Favorites unique, history 90 kun/100 klub, user izolyatsiyasi va yashirin klub siyosati integratsion tekshirildi. |
| [13](steps/13.md) | Ratings, reviews va javoblar | DONE | Review pending moderation, 6 mezon va 1–5 oralig‘i, owner reply, unique helpful va reyting agregati tekshirildi; faqat tashrif buyurganlar review yozishi talabi BLOCKED bo‘lib qoladi. |
| [14](steps/14.md) | Media (rasm/video) | DONE | Dev/test local upload, owner tekshiruvi, JPEG/PNG/WebP, 8 MiB/20 rasm limitlari va URL’dan olish PASS; production storage provayderi OPEN, video upload yo‘q. |
| [15](steps/15.md) | Ish vaqti va mavjudlik | DONE | Club IANA timezone (default `Asia/Tashkent`), 24/7 va yarim tundan o‘tuvchi interval, availability endpoint; `occupancy` har doim `unknown` manba ulanmaguncha. |
| [16](steps/16.md) | Statistika va audit | DONE | Owner club stats, admin overview/audit, actor-attributed club/review/role events, append-only triggerlar va aggregate indexlar tekshirildi. |
| [17](steps/17.md) | API hujjati, test va sifat nazorati | DONE | API v1 kontrakti muzlatildi; OpenAPI parse testi, ESLint, Supertest E2E va real PostgreSQL/PostGIS bilan 48 test PASS. Alohida test DB yaratish buyruqlari README’da. |
| [18](steps/18.md) | Production / DevOps | IN PROGRESS | Multi-stage image/Compose build+start, 16 migration, 48 test, readiness, SIGTERM, TLS 1.2/1.3, volume persist va backup/restore PASS. npm audit 0 vulnerability; GitHub Actions, haqiqiy domen/certificate, production deploy gate va monitoring account sozlanmagan. |
| [19](steps/19.md) | MVP yakuniy qabul sinovi | BLOCKED | 18-bosqich `DONE` bo‘lmagani uchun boshlanmadi; AGENTS.md qoidasi bo‘yicha avval 18 production qabul mezonlarini yakunlash kerak. |
| [20](steps/20.md) | MVP'dan keyin (alohida roadmap) | TODO | — |

## Oxirgi bajarilgan ish hisoboti

> Codex har bosqich oxirida **faqat joriy bosqich** natijasini shu yerga yozadi. Eski hisobotlarni o‘chirmasdan qisqa arxiv sifatida qoldirishi mumkin.

```text
Bosqich: 18 — Production / DevOps
Holat: IN PROGRESS — lokal/container qabul sinovlari PASS; real production domeni, ishonchli TLS sertifikati, deploy muhiti va monitoring account’i bu repoda/host’da sozlanmagan.
O‘zgargan fayllar: `Dockerfile`, `.dockerignore`, `compose.yaml`, `deploy/postgres/10-app-role.sh`, `deploy/nginx/default.conf`, `.github/workflows/backend-ci.yml`, `docs/backend/OPERATIONS.md`, `.gitignore`, `package.json`, `package-lock.json`, `docs/backend/PROGRESS.md`.
Kod/sozlama: Node 22 multi-stage image final bosqichga faqat production dependency’larni oladi va `node` user bilan ishlaydi; production JS migration buyruqlari qo‘shildi. Compose PostgreSQL 18 + PostGIS 3.6 named volume, 10 MiB × 5 Docker log rotation, non-superuser ilova DB roli va API runtime env’ni sozlaydi; DB admin parollari API konteyneriga berilmaydi. `/api/health` DB readiness check; SIGINT/SIGTERM HTTP server va Pool’ni yopadi. Nginx TLS 1.2/1.3, HTTP→HTTPS, 8 MiB body limit va proxy header’lari bilan. CI `npm ci`, production audit, lint/typecheck, migration+seed, test, build/image qiladi; production deploy yo‘q, u hosting/protected GitHub environment berilgach alohida manual gate bilan sozlanadi.
Operatsiya/xavfsizlik: Compose/env sozlamalari tekshirilib, API runtime env, init SQL DB nomi va test uchun port/TLS cert yo‘llari tuzatildi. `.env.*` ( `.env.example` istisno), sertifikat va backup papkalari Git/Docker build context’dan chetda. `OPERATIONS.md`da start/migration/rollback ketma-ketligi, external secrets, backup/restore hamda monitoring/reten­siya ko‘rsatmalari bor.
Tekshiruv: `npm ci` PASS; `npm audit --omit=dev` PASS, 0 vulnerabilities; lint/typecheck/build PASS; 48/48 test PASS (alohida Docker PostGIS 18 test DB’da seed bilan); Docker production image build PASS; runtime image devDependencies’siz ekani PASS; 16 migration PASS; Compose DB role `rolsuper=false`, `rolcreatedb=false` PASS; `/api/health` 200 PASS; SIGTERM exit 0 va restart health PASS; Nginx `-t`, localhost HTTPS va HTTP 301 PASS; OpenSSL TLS 1.2/1.3 handshake PASS; DB named volume restart’dan keyin 16 migration/5 game saqlanishi PASS; `pg_dump`→yangi recovery DB `pg_restore` PASS (PostGIS 3.6, 16 migration, 5 game); Compose/CI YAML parse/runtime env va `git diff --check` PASS. GitHub Actions hosted run, real public domain/trusted certificate, provider deploy approval, external alerting/error tracking va tashqi encrypted backup schedule NOT RUN; production acceptance shularsiz BLOCKED.
Keyingi bosqich: 19 — avtomatik boshlanmaydi.
```

```text
Bosqich: 17 — API hujjati, test va sifat nazorati
Holat: DONE — API v1 kontrakti versiyalandi/muzlatildi; integratsion va unit/E2E testlar, sifat buyruqlari PASS.
O‘zgargan fayllar: `package.json`, `package-lock.json`, `eslint.config.js`, `src/modules/clubs/club.repository.ts`, `src/modules/media/media.routes.ts`, `docs/API.md`, `docs/openapi.yaml`, `README.md`, `test/catalog-users.integration.test.ts`, `test/clubs.integration.test.ts`, `test/openapi.test.ts`, `test/search.integration.test.ts`, `test/service-policy.test.ts`, `test/telegram-auth.test.ts`, `test/validation.test.ts`, `docs/backend/PROGRESS.md`.
API: `/api/v1` endpoint, body/query, auth/role, pagination va umumiy xato formatlari `docs/API.md`da; OpenAPI 3.1 spetsifikatsiyasi YAML parse va muhim route coverage bo‘yicha test bilan tekshiriladi. Yonma-yon frontend repozitoriyasi tekshirildi: club repository mock’ga ulangan va HTTP adapteri yo‘q. Backend v1 javob kontrakti integratsiya uchun target sifatida muzlatildi; mavjud frontend API so‘rovlari bilan nomuvofiqlik yo‘q.
Test qamrovi: barcha modul schema oilalarining valid/invalid holatlari `validation.test.ts`da; moderation/review role policy service unit testlarda; Express + Supertest’da Telegram login, club CRUD/owner authorization, filter/search, games va users oqimlari. PostgreSQL/PostGIS repository integration suite CRUD, SQL injection ko‘rinishidagi qidiruv matni, IDOR/ownership, rate limit, expired Telegram initData, JWT expiry va invalid coordinates’ni tekshiradi.
Test muhiti: README’da PostgreSQL 18 Windows uchun alohida `gameclubfinder_test` yaratish, PostGIS yoqish, `gameclub_app`ga grant berish, migration/seed va test buyruqlari yozildi. To‘liq suite mavjud lokal `.env` PostgreSQL/PostGIS bazasida bajarildi; fixture qatorlari tozalandi, append-only audit eventlar saqlandi. Izolyatsiyalangan `gameclubfinder_test` bu sessiyada yaratilmagan: `gameclub_app` rolida CREATEDB yo‘q va `postgres` admin autentifikatsiyasi parolsiz ishlamadi. README’dagi buyruqlar alohida test DB’ni admin hisobi bilan ko‘tarish uchun tayyor.
Tekshiruv: `npm run typecheck` PASS; `npm run lint` PASS; `npm run test` PASS, 48/48; `npm run build` PASS; `git diff --check` PASS (faqat CRLF ogohlantirishlari).
Keyingi bosqich: 18 — avtomatik boshlanmaydi.
```

```text
Bosqich: 16 — Statistika va audit
Holat: DONE — owner/admin ko‘rsatkichlari, ruxsatlar, audit yozuvlari va append-only himoyasi PASS.
O‘zgargan fayllar: `database/migrations/1700000014000_add_statistics_and_audit.js`, `database/migrations/1700000015000_add_statistics_indexes.js`, `src/modules/statistics/*`, `src/modules/clubs/club.routes.ts`, `src/modules/clubs/club.repository.ts`, `src/modules/clubs/club.service.ts`, `src/modules/moderation/moderation.routes.ts`, `src/modules/moderation/moderation.repository.ts`, `src/modules/reviews/reviews.repository.ts`, `test/statistics-audit.integration.test.ts`, `docs/backend/DECISIONS.md`, `docs/backend/PROGRESS.md`.
API: owner/admin `GET /api/v1/clubs/:id/stats`; faqat admin `GET /api/v1/admin/stats` va `GET /api/v1/admin/audit?limit=50` (limit 1–100). Oddiy user va boshqa club egasi rad etilishi tekshirildi.
Hisoblash: owner club stats stored `view_history.view_count`/viewer, favorite count va public rating count/avg qaytaradi. Admin active/pending/approved/rejected/new-30-day clublar, 30 kunda kuzatilgan faol userlar va umumiy stored history/favorite/approved-review sonlarini oladi. GET endpointlar aggregate o‘qiydi; public GET request counter yozilmaydi. History retention sabab view metrikalari `storedHistory...` deb nomlangan.
Audit: club create/update/status, review moderation va user role transition trigger orqali actor ID, action, entity, changed field nomlari va minimal metadata bilan qayd etiladi. Matn, manzil, Telegram ID yoki row nusxasi yozilmaydi. `audit_events` UPDATE/DELETE’ga DB trigger bilan ruxsat bermaydi; actor context’siz role o‘zgarishi bloklanadi. Club moderationning mavjud alohida audit jadvali saqlanadi.
DB: `1700000014000_add_statistics_and_audit` audit jadvali, triggerlar va indexlarni; `1700000015000_add_statistics_indexes` owner/admin aggregate query’lari uchun indexlarni qo‘shdi. Ikkala migration mavjud lokal DB’ga qo‘llandi; ma’lumotlar o‘chmadi.
Tekshiruv: migrations PASS; `npm run typecheck` PASS; `npm run build` PASS; stats/audit/moderation/review targeted integration 3/3 PASS; to‘liq suite 37/37 PASS (lokal PostgreSQL bilan); `git diff --check` PASS (LF/CRLF ogohlantirishlari bor).
Keyingi bosqich: 17 — avtomatik boshlanmaydi.
```

```text
Bosqich: 15 — Ish vaqti va mavjudlik
Holat: DONE — ish vaqti, club timezone, availability javobi va qidiruvdagi openNow tekshirildi; real-time occupancy integratsiyasi mavjud emas va `unknown` deb qaytariladi.
O‘zgargan fayllar: `database/migrations/1700000013000_add_club_timezone.js`, `src/modules/clubs/availability.ts`, `src/modules/clubs/availability.repository.ts`, `src/modules/clubs/availability.service.ts`, `src/modules/clubs/club.schema.ts`, `src/modules/clubs/club.repository.ts`, `src/modules/clubs/club.controller.ts`, `src/modules/clubs/club.routes.ts`, `src/modules/discovery/search.repository.ts`, `test/availability.test.ts`, `test/availability.integration.test.ts`, `test/search.integration.test.ts`, `docs/backend/DECISIONS.md`, `docs/backend/PROGRESS.md`.
Qaror: ish vaqti JSONB’da `mon`–`sun` va 24 soatlik `HH:mm`; kun yo‘q/bo‘sh bo‘lsa yopiq; `00:00`–`00:00` 24/7; ochilish inclusive, yopilish exclusive; `09:00`–`02:00` keyingi kunga o‘tadi. Club timezone IANA nomi sifatida saqlanadi, default `Asia/Tashkent`; jadval timezone bo‘yicha hisoblanadi.
API: `GET /api/v1/clubs/:id/availability` approved/active club uchun `{ isOpenNow, occupancy: "unknown", timezone }` qaytaradi; yashirin/inactive club 404. Club create/update `timezone` qabul qiladi. Search `openNow` har club timezone’ini ishlatadi.
DB: migration `1700000013000_add_club_timezone` timezone ustunini default bilan qo‘shdi; mavjud qatorlar saqlanib, `Asia/Tashkent` qiymatini oldi; migration lokal DB’ga qo‘llandi.
Tekshiruv: migration PASS; `npm run typecheck` PASS; `npm run build` PASS; boundary/24x7/timezone unit va endpoint integration testlari PASS; openNow search integration PASS; to‘liq suite 36/36 PASS (lokal PostgreSQL bilan); `git diff --check` PASS (LF/CRLF ogohlantirishlari bor).
Keyingi bosqich: 16 — avtomatik boshlanmaydi.
```

```text
Bosqich: 14 — Media (rasm/video)
Holat: DONE — local development image upload va URL endpoint ishlaydi. Production storage provayderi/ video formati tanlanmagani DECISIONS.md’da OPEN; production upload 503 qaytarib yopiq turadi.
O‘zgargan fayllar: `database/migrations/1700000012000_add_club_image_metadata.js`, `src/integrations/storage/*`, `src/modules/media/*`, `src/modules/clubs/club.routes.ts`, `club.repository.ts`, `club.schema.ts`, `src/modules/discovery/nearby.repository.ts`, `src/app.ts`, `.gitignore`, `test/media.integration.test.ts`, `docs/backend/DECISIONS.md`, `docs/backend/PROGRESS.md`.
API: `POST /api/v1/clubs/:id/images` — JWT `club_owner`, raw image bytes, `Content-Type: image/jpeg|image/png|image/webp`, `X-Media-Category: cover|interior|equipment`, ixtiyoriy `X-Display-Order` (0–100000). `GET /api/v1/media/:id` faqat approved va faol klub rasmini qaytaradi; klub detail’dagi `images` metadata kategoriyani, MIME, hajm va tartibni ko‘rsatadi. Cover nearby javobida avval tanlanadi.
Saqlash/xavfsizlik: development/test fayllari Git’dan chetda bo‘lgan `var/media` ichida UUID nomida saqlanadi; yuborilgan filename ishlatilmaydi. Tasdiqlangan owner bo‘lmagan upload 401/403. Fayl turi header va JPEG/PNG/WebP magic bytes bilan mosligi tekshiriladi; SVG qabul qilinmaydi. Body-parser 8 MiB’dan kattani 413 qaytaradi; bitta klub jami 20 media yozuvdan oshmaydi. DB’da fayl emas, relative URL, storage key, MIME, byte hajmi, kategoriya va display order turadi. Club profile image almashtirilganda eski local fayllar tozalanadi.
DB: `club_images`ga eski qatorlarni saqlagan holda metadata ustunlari va check/unique constraintlar qo‘shildi; `display_order` avvalgi `sort_order` qiymatlaridan ko‘chirildi. Migration `1700000012000_add_club_image_metadata` mavjud lokal bazaga qo‘llandi.
Tekshiruv: migration PASS; `npm run typecheck` PASS; `npm run build` PASS; media DB+HTTP integration PASS; to‘liq test suite 31/31 PASS (lokal PostgreSQL bilan); `git diff --check` PASS (faqat LF/CRLF ogohlantirishlari).
Keyingi bosqich: 15 — avtomatik boshlanmaydi.
```

```text
Bosqich: 13 — Ratings, reviews va javoblar
Holat: DONE — API, migratsiya, moderatsiya va reyting agregati bajarildi. Tashrifni isbotlash mavjud bo‘lmagani uchun “faqat tashrif buyurganlar review yozadi” talabi BLOCKED; API verified-visitor da’vosi bermaydi.
O‘zgargan fayllar: `database/migrations/1700000011000_create_reviews_and_review_interactions.js`, `src/modules/reviews/*`, `src/modules/moderation/moderation.routes.ts`, `src/modules/discovery/search.repository.ts`, `src/modules/discovery/nearby.repository.ts`, `src/app.ts`, `test/reviews.integration.test.ts`, `docs/backend/DECISIONS.md`, `docs/backend/PROGRESS.md`.
API: `GET/POST /api/v1/clubs/:id/reviews`; `PUT/DELETE /api/v1/reviews/:id`; `POST /api/v1/reviews/:id/reply`; `POST /api/v1/reviews/:id/helpful`; admin uchun `PATCH /api/v1/admin/reviews/:id/status`. Review yaratish faqat `user`; javob faqat club egasi; moderatsiya faqat admin. Har user-club juftligi bitta review, takror POST 409. Yangi/tahrirlangan review pending, tahrir egaga tegishlilik bilan himoyalangan.
Reyting: performance, equipment, service, cleanliness, comfort, valueForMoney — barchasi integer 1–5. Yangi review umumiy balli oltita mezonning o‘rtachasi; public aggregate faqat approved va flag qilinmagan reviewlardan live hisoblanadi. Legacy `club_ratings` qatorlari/unique constraint saqlanadi va oldingi ballar hisobda qoladi. Pending/rejected/flagged review public ro‘yxat va agregatdan chiqariladi; edit qayta moderatsiyaga yuboradi. DELETE review va reytingni bir transaction’da olib tashlaydi.
Javob/foydali: javob faqat o‘zining faol klubidagi approved reviewga; bitta javob qayta yuborilsa yangilanadi. Helpful ovozlar alohida `(review_id,user_id)` unique jadvalida; user o‘z izohiga ovoz bera olmaydi, takroriy ovoz sonni oshirmaydi.
DB: migration `1700000011000_create_reviews_and_review_interactions` mavjud bazaga qo‘llandi. `reviews`, `review_replies`, `review_helpful_votes`, oltita nullable legacy-compatible kriteriy va FK/unique/check constraintlar qo‘shildi; mavjud reytinglar o‘chirilmadi.
Tekshiruv: `npm run typecheck` PASS; `npm run build` PASS; review DB+HTTP integratsion test PASS; to‘liq suite 30/30 PASS. Qamrov: range validation, foreign review edit/delete, pending/public visibility, admin moderation, owner-only reply, helpful dedup, average change on approval/edit/delete. Nearby eski test parallel fixturelar sabab birinchi full run’da vaqtincha fail bo‘ldi; targeted run PASS, full rerun 30/30 PASS.
Keyingi bosqich: 14 — avtomatik boshlanmaydi.
```

```text
Bosqich: 12 — Favorites va ko‘rish tarixi
Holat: DONE — API, migration, user izolyatsiyasi, dedup va retention tekshirildi.
O‘zgargan fayllar: `database/migrations/1700000010000_create_favorites_and_history.js`, `src/modules/favorites/*`, `src/modules/history/*`, `src/modules/auth/authenticate.ts`, `src/modules/clubs/club.routes.ts`, `club.controller.ts`, `src/app.ts`, `test/favorites-history.integration.test.ts`, `docs/backend/DECISIONS.md`, `docs/backend/PROGRESS.md`.
API: JWT talab qilinadigan `GET /api/v1/favorites`, `POST /api/v1/favorites/:clubId`, `DELETE /api/v1/favorites/:clubId`, `GET /api/v1/history`. Ro‘yxatlar page=1, limit=20, max=100 va total metadata qaytaradi. Yangi favorite 201, takroriy POST 200 va bitta yozuv, DELETE 200 `{removed:boolean}`.
Ko‘rish tarixi: faqat JWT bilan `GET /api/v1/clubs/:id` muvaffaqiyatli bo‘lganda yoziladi; anonim detail history’ga tushmaydi, noto‘g‘ri token 401. User–club unique qatorida `view_count` oshadi. So‘nggi ko‘rishdan 90 kun o‘tgan va 100 tadan ortiq yozuv userning keyingi ko‘rishi yoki history o‘qishida o‘chiriladi.
Ko‘rinish: faqat approved/active club favorite’ga qo‘shiladi; pending/inactive POST va detail 404. Keyin yashirilgan club favorites/history list’da ko‘rinmaydi; favorite’ni DELETE qilish mumkin. Barcha list/insert/delete user IDni JWT’dan oladi.
DB: `favorites` va `view_history` jadvali, FK va user–club unique constraint mavjud bazaga `1700000010000_create_favorites_and_history` migratsiyasi bilan qo‘shildi; mavjud jadvallar o‘chirilmagan.
Tekshiruv: `npm run typecheck` PASS; `npm run build` PASS; migration UP PASS; real DB+HTTP integratsion testlar favorites duplicate/remove/ikki user, yashirin club, anon/token detail, history dedup, 90 kun va 100 klub limitini PASS tekshirdi. To‘liq test to‘plami: 29/29 PASS.
Keyingi bosqich: 13 — avtomatik boshlanmaydi.
```

```text
Bosqich: 11 — Qidiruv va keng filtrlar
Holat: DONE — qidiruv, barcha filter guruhlari, edge testlar va DB migration bajarildi.
O‘zgargan fayllar: `database/migrations/1700000009000_create_club_ratings.js`, `src/modules/clubs/club.schema.ts`, `src/modules/clubs/club.controller.ts`, `src/modules/clubs/club.service.ts`, `src/modules/clubs/club.repository.ts`, `src/modules/discovery/search.*`, `src/app.ts`, `test/search.integration.test.ts`, `docs/backend/DECISIONS.md`, `docs/backend/PROGRESS.md`
API: `GET /api/v1/clubs?q=...&city=...&page=...&limit=...&sort=newest|name|price_low|price_high`; `POST /api/v1/search`; `GET /api/v1/filters/options`. Search response club ma’lumotlari, masofa, minimum soatlik narx va `ratingAvg` beradi. Sort qiymatlari allowlist; barcha user qiymatlari bind parametr. Har sort `id` bilan barqaror tie-break qilinadi; limit max 100.
Filtr semantikasi: status approved va active majburiy; filter guruhlari AND, games/roomTypes/services array ichida OR. Games, equipment, features va pricing `EXISTS` bilan filtrlanadi, child yozuvlar clubni dublikat qilmaydi. Equipment Hz va RAM bir xil equipment qatorida mos tushishi shart; min/max narx bitta pricing qatoriga tatbiq qilinadi. `GET /clubs` q/city hamda name/newest/price sort qo‘llaydi.
Filter options faqat public approved/active klublarda mavjud xona turlari, xizmatlar, hardware va narx diapazonini qaytaradi; o‘yinlar katalogdan keladi.
Qarorlar/DB: reyting `club_ratings.rating` jadvalidagi 1–5 baholarning o‘rtachasi; bir user-club juftligi unique. Tashrifni tasdiqlash alohida 13-bosqich masalasi bo‘lib qoladi. Club ish vaqti `Asia/Tashkent` timezone’da hisoblanadi; `openNow:false` yopiq klublarni qaytaradi. `1700000009000_create_club_ratings` migratsiyasi mavjud bazaga qo‘llandi; database/jadvallar o‘chirilmagan.
Filtr semantikasi: guruhlar AND, `games`/`roomTypes`/`services` array ichida OR. Child jadvallar `EXISTS` orqali klub dublikatini oldini oladi. Hardware Hz/RAM bir equipment qatorida, narx min/max bitta pricing qatorida tekshiriladi. Filter options `ratings: {min:1,max:5}` va `openNow:{timezone:'Asia/Tashkent'}` qaytaradi.
Tekshiruv: real PostgreSQL/PostGIS test 4+ filter birgalikda ishlashi, dublikat yo‘qligi, narx ichki/tashqi chegaralari, monitor Hz, rating 4.5 chegara, openNow true/false, 1m radius ichida/tashqarisi, distance sort va options’ni tekshirdi; fixturelar tozalandi.
Buyruqlar va natija: `npm run db:migrate -- up` → PASS, `1700000009000_create_club_ratings`; `npm run typecheck` → PASS; `npm run build` → PASS; `npm test` → PASS, 25/25; `npm run db:check` → PASS, PostgreSQL/PostGIS 3.6.
Keyingi bosqich: 12 — avtomatik boshlanmaydi.
```

```text
Bosqich: 10 — PostGIS yordamida yaqin clublarni topish
Holat: DONE — koordinata radiusi va shahar fallback qidiruvi, masofa tartibi, qamrov hamda input tekshirildi
O‘zgargan fayllar: `database/migrations/1700000008000_add_club_city.js`, `src/app.ts`, `src/modules/clubs/club.schema.ts`, `club.repository.ts`, `src/modules/discovery/*`, `test/nearby.integration.test.ts`, `docs/backend/PROGRESS.md`
API: `GET /api/v1/clubs/nearby?lat=...&lng=...&radius=...&page=...&limit=...` yoki koordinata ruxsati bo‘lmaganda `?city=Tashkent&page=...&limit=...`. `nearby` statik router `/api/v1/clubs/:id` routeridan avval mount qilindi. Radius metrda, default 5000, ruxsat etilgan oraliq 1–50000; page=1, limit=20, max=100.
PostGIS: radius mode `GEOGRAPHY(POINT,4326)` ustida `ST_DWithin` bilan filtrlaydi va `ST_Distance` bo‘yicha yaqindan saralaydi; param tartibi `[lng, lat, radiusMeters, limit, offset]`. `GIST(location)` indeksi 07 migrationida allaqachon bo‘lgan va integration testda DB’dan tasdiqlandi; redundant indeks qo‘shilmadi. Ommaviy natijada faqat `approved AND is_active` clublar bor.
Javob: club ID, nom, city, manzil, lng/lat, `distanceMeters`, `ratingAvg`, `coverImageUrl`; cover birinchi tartiblangan club image’dan olinadi. Reyting agregati hali yaratilmagani uchun `ratingAvg: null`; shahar rejimida koordinata bo‘lmagani uchun `distanceMeters: null`. Bu qiymatlar sun’iy 0 bilan almashtirilmaydi.
Shahar: `game_clubs.city` nullable ustuni va case-insensitive exact-match partial index qo‘shildi. Eski club yozuvlariga shahar taxminan to‘ldirilmadi; ular shahar qidiruvida chiqishi uchun city maydoni keyinchalik egasi/admin tomonidan kiritilishi kerak.
Validatsiya: latitude [-90,90], longitude [-180,180], lat/lng ikkalasi birga, city yoki koordinata rejimidan faqat bittasi; city bilan radius ishlatilmaydi. Noto‘g‘ri koordinata, partial coords, radius chegarasidan chiqish va rejimlar aralashishi 400 qaytaradi.
Tekshiruv: real PostgreSQL/PostGIS integration test 1km/5km/10km radius, yaqinlik bo‘yicha tartib, lng/lat, cover URL, city rejimi, pending va inactive klublarni yashirish, GiST indeks va 400 validatsiyalarini tekshirdi; test fixturelari yakunda tozalandi.
Buyruqlar va natija: `npm run db:migrate` → PASS, `1700000008000_add_club_city`; `npm run typecheck` → PASS; `npm run build` → PASS; `npm test` → PASS, 24/24; `npm run db:check` → PASS, PostgreSQL/PostGIS 3.6.
Keyingi bosqich: 11 — avtomatik boshlanmaydi
```

```text
Bosqich: 09 — Club moderatsiyasi
Holat: DONE — admin moderatsiyasi, audit va egaga ariza holati endpointlari bajarildi
O‘zgargan fayllar: `database/migrations/1700000007000_create_club_moderation_audit.js`, `src/app.ts`, `src/modules/moderation/*`, `test/moderation.integration.test.ts`, `docs/backend/DECISIONS.md`, `docs/backend/PROGRESS.md`
API: `GET /api/v1/admin/clubs/pending` faqat admin uchun; `PATCH /api/v1/admin/clubs/:id/status` faqat admin uchun va `pending → approved/rejected` o‘tishini qabul qiladi; reject uchun sabab majburiy. `GET /api/v1/clubs/:id/status` egasi yoki admin uchun status, ko‘rib chiqilgan vaqt va sababni qaytaradi.
Audit: `game_club_moderation_audit`da club ID, moderator ID, old/new status, sabab va vaqt saqlanadi. Status update va audit insert bitta transaction’da; concurrency uchun club satri `FOR UPDATE` bilan qulflanadi. Audit FK’lari `RESTRICT`, soft-deleted klublarda ham izlar qoladi.
Public ko‘rinish: joriy list/detail endpointlari avvalgidek `approved AND is_active` filtridan foydalanadi; pending/rejected public detail’da 404 va list’da ko‘rinmaydi. Search/nearby endpointlari hali yaratilmagan; keyingi qidiruv bosqichlarida ham shu filtr talab qilinadi.
Qaror: rad etilgan klubni qayta topshirish workflow’i `DECISIONS.md`da OPEN qoldirildi. Hozirgi API faqat pending holatni ko‘rib chiqadi; yakunlangan statusni qayta o‘zgartirmaydi.
Tekshiruv: haqiqiy DB + HTTP integration test admin pending list, admin-only ruxsat, egasining statusi va boshqa egaga 403, reject sabab validatsiyasi, approved public bo‘lishi, rejected yashirin qolishi, takroriy transition 409 va auditdagi admin/old/new/reason qiymatlarini tekshirdi. Test fixturelari tozalandi.
Buyruqlar va natija: `npm run db:migrate` → PASS, `1700000007000_create_club_moderation_audit`; `npm run typecheck` → PASS; `npm run build` → PASS; `npm test` → PASS, 23/23.
Keyingi bosqich: 10 — avtomatik boshlanmaydi
```

```text
Bosqich: 08 — Club ichki ma’lumotlari
Holat: DONE — profil jadvallari, schema validation, detail response va atomik CRUD tekshirildi
O‘zgargan fayllar: `database/migrations/1700000006000_create_club_details.js`, `src/modules/clubs/club.schema.ts`, `club.repository.ts`, `club.service.ts`, `test/clubs.integration.test.ts`, `docs/backend/DECISIONS.md`, `docs/backend/PROGRESS.md`
Kod: `club_equipment` (Hz/CPU/GPU/RAM), `club_features` (service/room_type), `club_pricing` (standard/VIP/console va chegirma), `club_images` (metadata URL), `club_games` FK, `game_clubs.working_hours` JSONB qo‘shildi. Club detail barcha ichki profil qismlarini qaytaradi; list response yengil qoladi. Equipment/features ko‘p yozuvli, ish vaqti haftaning `mon`–`sun` kalitlari va `HH:mm` interval array’lari; close < open bo‘lsa yarim tundan o‘tadi.
Xavfsizlik/validatsiya: narx manfiy bo‘lishi, discount 0–100 oralig‘idan chiqishi, Hz 30–1000’dan tashqarisi, RAM 1–1024’dan tashqarisi va mavjud bo‘lmagan game ID rad etiladi. `club_games` FK va unique juftlik bilan himoyalangan.
Transaction: club yaratish, asosiy maydonlar va berilgan child array’larni almashtirish bitta `pg` client transaction’da bajariladi. Noto‘g‘ri game ID xatosida club yaratish rollback bo‘lishi, tahrirdagi eski equipment esa saqlanishi integratsion tekshirildi. Owner authorization saqlanadi.
DB: migration `1700000006000_create_club_details` mavjud DB’ga qo‘llandi; games avval yaratilgan. DB o‘chirilmagan/qayta yaratilmagan. Timezone qarori `DECISIONS.md`da OPEN — vaqtlar hozircha klubning mahalliy wall-clock vaqti.
Buyruqlar va natija: `npm run typecheck` → PASS; `npm run build` → PASS; `npm test` → PASS, 22/22; `npm run db:migrate` → PASS; `npm run db:check` → PASS, PostgreSQL/PostGIS 3.6.
Keyingi bosqich: 09 — avtomatik boshlanmaydi
```

```text
Bosqich: 07 — Clubs asosiy CRUD
Holat: DONE — `game_clubs` migration, CRUD endpointlari va qabul mezonlari bajarildi
O‘zgargan fayllar: `database/migrations/1700000005000_create_game_clubs.js`, `src/app.ts`, `src/modules/clubs/club.routes.ts`, `club.controller.ts`, `club.service.ts`, `club.repository.ts`, `club.schema.ts`, `test/clubs.integration.test.ts`, `docs/backend/PROGRESS.md`
Kod: `GET /api/v1/clubs` va `GET /:id` faqat approved/active yozuvlarni ko‘rsatadi; POST yangi clubni pending yaratadi; PUT egasi/admin bilan tekshiriladi; DELETE `is_active=false` soft delete. Owner ID JWT’dan olinadi, request body strict schema `ownerId`/status eskalatsiyasini rad qiladi; unique slug uchun 409 `CLUB_SLUG_CONFLICT`; page=1, limit=20, max=100; list metadata’da total natija bo‘sh sahifada ham to‘g‘ri hisoblanadi.
DB: `game_clubs` geography(Point,4326), `ST_MakePoint(lng, lat)`, slug unique, users FK RESTRICT, status va active defaults, owner/status/GiST indekslari. Migration `1700000005000_create_game_clubs` mavjud bazaga qo‘llandi; jadval yoki database o‘chirilmadi.
Tekshiruv: real HTTP + PostgreSQL/PostGIS integration test temporary users/clubs yaratib, owner create/update, ordinary user va boshqa owner 403, client ownerId 400, pending public list/detail yashirin, duplicate slug 409, tasdiqlangan detail koordinatalari lng/lat tartibida, soft delete va owner FK trace saqlanishini tekshirdi; vaqtinchalik fixturelar test yakunida tozalandi.
Buyruqlar va natija: `npm run typecheck` → PASS; `npm run build` → PASS; `npm test` → PASS, 22/22; `npm run db:migrate` → PASS, migration qo‘llandi; `npm run db:check` → PASS, PostgreSQL/PostGIS 3.6.
Keyingi bosqich: 08 — avtomatik boshlanmaydi
```

```text
Bosqich: 06 — JWT, refresh token, RBAC va obyekt ruxsatlari
Holat: DONE — token/session flows, role migration, middleware va testlar PASS
O‘zgargan fayllar: `package.json`, `package-lock.json`, `.env.example`, `README.md`, `src/config/env.ts`, `src/app.ts`, `src/middleware/error-handler.ts`, `src/modules/auth/*`, `src/modules/users/*`, `database/migrations/1700000003000_normalize_club_owner_role.js`, `database/migrations/1700000004000_create_auth_sessions.js`, `test/auth-tokens.test.ts`, `test/authz.test.ts`, `test/auth-rate-limit.test.ts`, `test/telegram-auth.test.ts`, `docs/backend/PROGRESS.md`
Kod: `jose` HS256 access JWT (15 daqiqa, issuer/audience/expiry); 256-bit opaque refresh token 30 kun, faqat SHA-256 hash DB’da saqlanadi; refresh rotatsiyasi transaction ichida, eski token reuse bo‘lsa family revoke; logout refresh family’ni bekor qiladi; `/auth/refresh`, `/auth/logout`, protected `/users/me`; `authenticate`/`requireRoles` va service policy `assertCanManageClub`; login 10 va refresh/logout 20 request / 15 daqiqa rate limit
DB: migrations `1700000003000_normalize_club_owner_role` va `1700000004000_create_auth_sessions` qayd etilgan; `auth_sessions`, FK/indexlar va `user/club_owner/admin` constraint tekshirildi; DB’dagi real rotate/reuse/logout oqimi vaqtinchalik test user bilan PASS, test user va unga tegishli sessionlar yakunda tozalandi
Qaror: club_owner rolini kim berishi `DECISIONS.md`da OPEN bo‘lib qoladi; login yoki request body rol oshirmaydi
Buyruqlar va natija: npm install `jose express-rate-limit` → PASS; npm run typecheck → PASS; npm run build → PASS; npm test → PASS, 21/21; npm run db:migrate → PASS, 0 pending (06 migrationlar migration history’da); npm run db:check → PASS, PostgreSQL/PostGIS 3.6; JWT expiry/reuse/logout, 401/403, club ownership va rate-limit testlari → PASS
Ishlatishga tayyorlash: `.env`ga JWT signing secret tasodifiy tarzda qo‘shildi va `.env` gitignore’da; haqiqiy `TELEGRAM_BOT_TOKEN` hali sozlanmagan, shuning uchun real Telegram’dan login token qo‘shilguncha 503 qaytaradi; secret qiymatlari terminal/log/Git’ga chiqarilmadi
Keyingi bosqich: 07 — avtomatik boshlanmaydi
```

```text
Bosqich: 05 — Telegram Mini App autentifikatsiyasi
Holat: DONE — implementatsiya, DB migration va testlar bajarildi; haqiqiy Telegram login uchun token sozlamasi kerak
O‘zgargan fayllar: `.env.example`, `src/config/env.ts`, `src/middleware/error-handler.ts`, `src/app.ts`, `src/integrations/telegram/verify-init-data.ts`, `src/modules/auth/*`, `src/modules/users/*`, `database/migrations/1700000002000_add_user_role.js`, `test/telegram-auth.test.ts`, `docs/backend/PROGRESS.md`
Kod: `POST /api/v1/auth/telegram` initData body schema, Telegram HMAC-SHA256 imzo va timestamp tekshiruvi, xavfsiz 401, user upsert, DB default role `user`; client yuborgan role/owner_id qabul qilinmaydi; token yo‘q holatda xavfsiz `AUTH_NOT_CONFIGURED` 503
Maxfiylik: test faqat vaqtinchalik test tokenidan foydalanadi; `.env`dagi token bor-yo‘qligi tekshirildi, qiymat chiqarilmadi; real bot token konfiguratsiya qilinmagan; `.env.example`da placeholder
Buyruqlar va natija: npm run typecheck → PASS; npm run build → PASS; npm test → PASS, 15/15; Telegram valid/fake/expired initData endpoint testlari → PASS; npm run db:migrate → PASS, `1700000002000_add_user_role`; role default read-only query → PASS (`user`); npm run db:check → PASS, PostGIS 3.6
Ishlatishga tayyorlash: `.env`da `TELEGRAM_BOT_TOKEN` hozir sozlanmagan; endpoint token qo‘shilmaguncha `AUTH_NOT_CONFIGURED` 503 qaytaradi; bot token qiymati testga yoki logga kiritilmadi
Keyingi bosqich: 06 — avtomatik boshlanmaydi
```

```text
Bosqich: 04 — Users bazasi va Games katalogi
Holat: DONE
O‘zgargan fayllar: `package.json`, `src/app.ts`, `database/migrations/1700000001000_create_games.js`, `src/database/seed.ts`, `src/modules/catalogs/games/*`, `src/modules/users/*`, `docs/backend/PROGRESS.md`
Kod: games uchun slug unique jadvali, repository/service/controller/routes va upsert seed qo‘shildi; seed CS2, Dota 2, Valorant, League of Legends va GTA V ni saqlaydi; users repository/service `telegram_id BIGINT`ni string sifatida qaytaradi; `/api/v1/users/me` response schema belgilandi, endpoint auth tayyor bo‘lmaguncha ochilmadi
DB: games migration mavjud bazaga qo‘llandi; seed ikki marta bajarildi; qayta seed dublikat qo‘shmadi
Tekshiruv: `GET /api/v1/games` → PASS, 5 o‘yin; `GET /api/v1/games/popular` → PASS, 5 o‘yin; 5 ta unikal slug tasdiqlandi
Buyruqlar va natija: npm run typecheck → PASS; npm run build → PASS; npm test → PASS, 12/12; npm run db:migrate → PASS, `1700000001000_create_games`; npm run db:seed → PASS, ketma-ket 2 marta
Keyingi bosqich: 05 — avtomatik boshlanmaydi
```

```text
Bosqich: 03 — PostgreSQL + PostGIS va migration
Holat: DONE
O‘zgargan fayllar: `.env.example`, `.env` (ignored, maxfiy), `package.json`, `README.md`, `src/config/env.ts`, `src/config/database.ts`, `src/app.ts`, `src/server.ts`, `src/database/check.ts`, `src/database/migrate.ts`, `database/migrations/1700000000000_initial_postgis_and_users.js`, `test/env.test.ts`, `test/http-errors.test.ts`, `docs/backend/PROGRESS.md`
Ulanish sozlamasi: foydalanuvchi bergan DB_HOST/PORT/NAME/USER/PASSWORD `.env`ga yozildi; qiymatlar logga yoki Git’ga chiqarilmadi; `.env.example`da password o‘rnida placeholder bor; `.env` ignore qilinadi
Kod: central pg.Pool, SELECT 1 health check, xavfsiz DB unavailable javobi, PostGIS tekshiruvi, migratsiya runneri va graceful pool cleanup qo‘shildi; birinchi migration PostGIS extension va `users` jadvalini yaratadi
Tekshiruv: Node.js `win32` platformasida ishladi (WSL/Docker emas); sandbox ichida localhost socketiga ruxsat yo‘q edi, ruxsatli Windows execution’da `localhost:5432` ochiq va PostgreSQL/PostGIS ulanishi ishladi. `.env` kalitlari tekshirildi, password qiymati chiqarilmadi; `.env` gitignore qilingan
DB holati: migrationdan oldin `public.users` va `public.pgmigrations` mavjud emasligi, PostGIS extension yoqilgani read-only query bilan tekshirildi; mavjud bazaga hech narsa o‘chirmasdan migration qo‘llandi; yakunda `users`, `pgmigrations`, 1 ta applied migration va PostGIS tasdiqlandi
Buyruqlar va natija: npm install --no-audit --no-fund → PASS; npm run typecheck → PASS; npm run build → PASS; npm test → PASS, 12/12; npm run db:migrate → PASS, `1700000000000_initial_postgis_and_users` bir marta qo‘llandi; npm run db:check → PASS, `SELECT 1` va PostGIS 3.6
Keyingi bosqich: 04 — avtomatik boshlanmaydi
```

## Ochilgan qarorlar / bloklovchilar

- Barcha ochiq biznes qarorlarini `DECISIONS.md`da qayd eting.
