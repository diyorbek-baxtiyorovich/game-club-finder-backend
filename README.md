# GameClubFinder backend

Node.js 22.12 yoki undan yangi versiya, TypeScript, Express 5 va PostgreSQL/PostGIS ishlatiladi.

## O‘rnatish

```powershell
npm install
```

## Development server

`.env.example` faylini `.env` nomi bilan nusxalab, keyin:

```powershell
npm run dev
```

Server `http://localhost:3000` manzilida ishlaydi. Tekshirish endpointi:
`GET http://localhost:3000/api/health` → `{ "status": "ok" }`.

## Swagger UI orqali API sinash

`http://localhost:3000/api/docs` sahifasini oching. Swagger UI kutubxonasi CDN orqali yuklanadi, shuning uchun sahifani ko‘rsatish uchun brauzerda internet bo‘lishi kerak; OpenAPI fayli va API so‘rovlari esa shu lokal serverdan olinadi.

Endpointni ochib **Try it out** → **Execute** bosing. Masalan, `GET /games` 200 status va o‘yinlar ro‘yxatini qaytaradi. Himoyalangan endpointlar uchun Telegram login javobidagi `accessToken`ni **Authorize** oynasiga kiriting. `club_owner` yoki `admin` amallari tegishli rolni talab qiladi. `docs/openapi.yaml`dagi ayrim endpointlar uchun request body/parametrlar hali to‘liq tavsiflanmagan; bunday so‘rovlarni Swagger’da aniq testlashdan oldin spetsifikatsiyani to‘ldirish kerak.

## Production build va start

```powershell
npm run build
npm start
```

`npm run build` TypeScript fayllarini `dist/` ichiga yig‘adi; `npm start` shu buildni ishga tushiradi.

## Ma’lumotlar bazasi

`.env` ichidagi `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` va `DB_PASSWORD` qiymatlari lokal PostgreSQL ulanishini sozlaydi. `.env` faylini Git'ga qo‘shmang.

```powershell
npm run db:migrate
npm run db:check
```

Migratsiya PostGIS kengaytmasini yoqadi va boshlang‘ich `users` jadvalini yaratadi. PostGIS extension yaratish huquqi yetarli bo‘lishi kerak.

## Autentifikatsiya

Telegram Mini App login uchun `.env`da `TELEGRAM_BOT_TOKEN`ni BotFather’dan olingan bot tokeni bilan sozlang. `JWT_ACCESS_SECRET` kamida 32 belgili maxfiy qiymat bo‘lishi kerak; `.env.example`dagi qiymatlar faqat namuna. Bu maxfiy qiymatlarni Git’ga qo‘shmang.

- `POST /api/v1/auth/telegram` — Telegram `initData`ni tekshiradi, access va refresh token beradi.
- `POST /api/v1/auth/refresh` — refresh tokenni rotatsiya qiladi; eski refresh token qayta ishlatilsa token oilasi bekor qilinadi.
- `POST /api/v1/auth/logout` — refresh token oilasini bekor qiladi.
- `GET /api/v1/users/me` — `Authorization: Bearer <accessToken>` talab qiladi.

Access token 15 daqiqa, refresh token 30 kun amal qiladi. Owner rolini berish workflow’i alohida qaror bo‘lib qoladi; login orqali ham, request body orqali ham rol oshirilmaydi.

## Testlar

Testlar real PostgreSQL/PostGIS bazasiga ulanadi. Ular fixture ma’lumotlarni vaqtincha yozib, asosiy qatorlarni testdan so‘ng tozalaydi; append-only audit hodisalari saqlanadi. Testni ishlab turgan yoki muhim ma’lumotli bazada emas, alohida lokal baza bilan bajaring.

PostgreSQL o‘rnatilgan PowerShell oynasida (database yaratish huquqiga ega rol bilan) bir marta test bazasini yarating:

```powershell
$pgBin = 'C:\Program Files\PostgreSQL\18\bin'
& "$pgBin\createdb.exe" -h localhost -p 5432 -U postgres gameclubfinder_test
& "$pgBin\psql.exe" -h localhost -p 5432 -U postgres -d gameclubfinder_test -c "CREATE EXTENSION IF NOT EXISTS postgis;"
& "$pgBin\psql.exe" -h localhost -p 5432 -U postgres -d gameclubfinder_test -c "GRANT CONNECT, CREATE, TEMP ON DATABASE gameclubfinder_test TO gameclub_app;"
& "$pgBin\psql.exe" -h localhost -p 5432 -U postgres -d gameclubfinder_test -c "GRANT USAGE, CREATE ON SCHEMA public TO gameclub_app;"
```

Project `.env` faylida test bazasiga ulanish qiymatlarini sozlang yoki buyruqlar oldidan `DB_NAME`ni joriy PowerShell sessiyasida o‘rnating. Muhit o‘zgaruvchisi `.env` qiymatidan ustun turadi:

```powershell
$env:DB_NAME = 'gameclubfinder_test'
npm run db:migrate
npm run db:seed
npm run typecheck
npm run lint
npm run test
npm run build
Remove-Item Env:DB_NAME
```

`npm run db:migrate` test bazasiga schema qo‘llaydi; `npm run db:seed` o‘yin katalogini tayyorlaydi. Integratsion testlar PostGIS geospatial qidiruvni, PostgreSQL repository qatlamlarini, CRUD, filtrlash, role/ownership ruxsatlari va xavfsizlik chegaralarini tekshiradi. E2E so‘rovlari Express ilovasiga Supertest bilan yuboriladi. `npm run test`ni `tsx --test` orqali ishlating.

Joriy endpoint va response kontraktlari [docs/API.md](docs/API.md), OpenAPI 3.1 spetsifikatsiyasi [docs/openapi.yaml](docs/openapi.yaml) fayllarida. Backend v1 kontrakti shu hujjatlarda muzlatilgan; frontend hozir mock repository ishlatadi va ushbu hujjat uning API ulash manbasi hisoblanadi.
