# GameClubFinder — Arxitektura ma’lumotnomasi

> **Doimiy o‘qish shart emas.** Faqat joriy bosqichga tegishli qismini oching. Asl roadmapdagi tegishli izohlar saqlangan.

## 1. Manbalar, tanlovlar va MVP chegarasi

### 1.1 Asos bo‘lgan hujjatlar

- `BACKEND(1).md` — biznes talablar, foydalanuvchi rollari, autentifikatsiya, API'lar, filtr va qidiruv.
- `DATABASE(1).md` — PostgreSQL + PostGIS, jadvallar, indekslar, reyting triggeri.
- `DEVOPS(1).md` — infratuzilma, Docker, CI/CD, xavfsizlik, monitoring, kelajakdagi optimallashtirish.

**Manbadan olingan talablar:** yaqin clublarni topish, profil, narxlar, jihozlar, o‘yinlar, filtrlar, Telegram login, uchta rol, favorites, reviews va club moderatsiyasi.  
**Arxitektura bo‘yicha yangi qaror:** FastAPI o‘rniga **Node.js + TypeScript + Express** ishlatish — bu loyihani boshlashda foydalanuvchi tanlagan yo‘l. Asl texnik vazifada Python/FastAPI berilgan; uni aynan ko‘chirmaymiz.  
**Yangi tavsiyalar:** qatlamlarga ajratish, migratsiya vositasi, test strategiyasi, versiyalangan API javoblari, xavfsizlik cheklovlari va bosqichlar tartibi — amaliy ishlab chiqish rejasi uchun kiritilgan.

### 1.2 MVP'da albatta bo‘ladiganlar

- Telegram Mini App foydalanuvchisini haqiqiy `initData` imzosi orqali aniqlash.
- `user`, `club_owner`, `admin` rollari va mulk egasiga tegishlilik tekshiruvi.
- Club profilini yaratish, boshqarish va tasdiqlash.
- Club ro‘yxati, batafsil ko‘rinishi, o‘yinlar, jihozlar, zona/xona, narx va ish vaqti.
- Radius bo‘yicha qidiruv, reyting/narx/jihoz/o‘yin/xizmat filtrlarini birlashtirish.
- Sevimlilar va ko‘rilgan clublar tarixi.
- Izoh, reyting, egasi javobi, izoh moderatsiyasi.
- Test, API hujjati, productionga tayyorlash.

### 1.3 Hozircha MVP'ga majburiy qo‘shilmaydiganlar

- Online booking, to‘lov, bonus/loyalty, turnirlar, chat, AI tavsiyalar (asl backend TZ'ning keyingi fazalari).
- Redis va navbat worker'lari — yuklama yoki asinxron ish talabi kelganda.
- Microservices, Kafka, Kubernetes — hozirgi hajm uchun kerak emas.
- **Haqiqiy real-time bandlik** — klubdan bandlikni yuboradigan ishonchli tizim/ma’lumot manbasi belgilanmaguncha mavjud deb ko‘rsatmaslik.

### 1.4 Dastlab aniqlash kerak bo‘lgan qarorlar

| Masala | Hujjatdagi holat | Amaliy vaqtinchalik yo‘l |
|---|---|---|
| Club egasi roli | `club_owner` bor, kim beradi — ochiq | Oddiy foydalanuvchi o‘zini admin qilib qo‘ya olmaydi; egaga aylantirish tasdiqlangan workflow bilan |
| Haqiqiy tashrif | Faqat tashrif buyurganlar izoh yozishi kerak | Tashrifni isbotlaydigan mexanizm aniqlanmaguncha buni bajarildi deb ko‘rsatmaslik |
| Real-time bandlik | Endpoint taklif qilingan, manba yo‘q | Faqat ish vaqtidan `open/closed`, bandlik uchun `unknown` |
| Xarita | Leaflet + OSM frontend tanlovi | Backend koordinata, masofa va filtrlangan ro‘yxat qaytaradi; xaritani backend chizmaydi |
| Fayl saqlash | Rasm/video yuklash talabi bor, saqlash joyi yo‘q | Boshida storage adapter; production uchun obyekt saqlash joyini tanlash kerak |
| Deployment | Docker/Nginx/CI namunasi bor, hosting aniq emas | Hosting aniqlangach production fayllarni moslash; namuna YAML'ni tayyor deployment deb qabul qilmaslik |

---

## 2. Doimiy texnik qarorlar

| Qism | Tanlov | Izoh |
|---|---|---|
| Runtime | Node.js (qo‘llab-quvvatlanadigan LTS) | Lokal va production versiyalari bir xil bo‘lsin |
| Til | TypeScript, `strict: true` | JS emas, typesafe backend |
| HTTP | Express 5 | Mavjud boshlang‘ich loyihani saqlaymiz |
| DB | PostgreSQL + PostGIS | Masofa qidiruvi va relational ma’lumotlar |
| DB client | `pg` | SQL'ni aniq nazorat qilish uchun |
| Migration | `node-pg-migrate` | Migratsiyalar bir marta qo‘llanib tarixda qoladi |
| Validation | `zod` | Params/query/body va config validatsiyasi |
| Telegram login | `@tma.js/init-data` (yoki rasmiy algoritmga mos tekshiruvchi) | Client yuborgan `user.id`ning o‘ziga ishonmaslik |
| JWT | `jose` | Access va refresh oqimi |
| Middleware | `helmet`, `cors`, `express-rate-limit` | Bosqichma-bosqich qo‘shiladi |
| Logger | `pino` + HTTP logger | Token/parol/`initData` logga yozilmaydi |
| Test | `vitest` + `supertest` | Service, API, RBAC testlari |
| Dev | `tsx` | `.ts` fayllarni ishlab chiqishda ishlatish |
| Deploy | Docker, Compose, Nginx/HTTPS, CI | Production bosqichida |

**Qoida:** `express` va `pg` va `zod` — asosiy tanlovlar; Prisma/NestJS/Fastify'ga jarayonning o‘rtasida sababsiz ko‘chmaymiz.

---

## 3. Yakuniy maqsadli loyiha strukturasi

> Quyidagi daraxt — **maqsadli ko‘rinish**. Hozir uning hammasini bo‘sh papka sifatida yaratma. Har modul o‘z bosqichida qo‘shiladi.

```text
game-find-back/
├── src/
│   ├── app.ts                         # Express middleware va routes
│   ├── server.ts                      # listen, shutdown
│   ├── config/
│   │   ├── env.ts                     # Zod orqali ENV validation
│   │   ├── database.ts                # pg Pool
│   │   └── logger.ts                  # pino
│   ├── common/
│   │   ├── errors/
│   │   │   └── app-error.ts
│   │   ├── middleware/
│   │   │   ├── error-handler.ts
│   │   │   ├── not-found.ts
│   │   │   ├── validate.ts
│   │   │   ├── authenticate.ts
│   │   │   ├── authorize.ts
│   │   │   └── rate-limit.ts
│   │   ├── utils/
│   │   │   ├── pagination.ts
│   │   │   └── slug.ts
│   │   └── types/
│   │       └── express.d.ts
│   ├── integrations/
│   │   ├── telegram/
│   │   │   └── verify-init-data.ts
│   │   └── storage/                   # keyinchalik: uploads adapter
│   └── modules/
│       ├── auth/
│       │   ├── auth.routes.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── auth.repository.ts
│       │   └── auth.schema.ts
│       ├── users/
│       │   ├── user.routes.ts
│       │   ├── user.controller.ts
│       │   ├── user.service.ts
│       │   ├── user.repository.ts
│       │   └── user.schema.ts
│       ├── clubs/
│       │   ├── club.routes.ts
│       │   ├── club.controller.ts
│       │   ├── club.service.ts
│       │   ├── club.repository.ts
│       │   └── club.schema.ts
│       ├── catalogs/                  # games va filter options
│       ├── discovery/                 # nearby + advanced search
│       ├── favorites/
│       ├── history/
│       ├── reviews/
│       ├── moderation/
│       ├── media/                     # keyinchalik
│       └── analytics/                 # keyinchalik
├── database/
│   ├── migrations/                    # node-pg-migrate fayllari
│   └── seeds/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── API.md
│   └── DECISIONS.md
├── .env.example
├── .env                         # faqat local, gitignore
├── .gitignore
├── .nvmrc                      # Node LTS versiyasi
├── package.json
├── package-lock.json
├── tsconfig.json
├── README.md
└── GameClubFinder_BACKEND_ROADMAP.md
```

### Modul chegarasi va qatlamlar

```text
HTTP request
  -> route (URL, method, middlewares)
  -> schema/validation (foydalanuvchi yuborgan input)
  -> controller (req -> service -> res)
  -> service (biznes qoida, authorization obyekt darajasida)
  -> repository (parametrli SQL, pg client)
  -> PostgreSQL/PostGIS
```

**Ta'qiqlanadigan odatlar:** controller ichida SQL; repository ichida `req/res`; service ichida Express'ga qaramlik; UI filter mantiqini backenddan ko‘chirib tashlash; har modulda yangi database Pool; bir funksiya uchun zarursiz 10 ta abstraksiya.

### Bir xil API javoblari

```json
// muvaffaqiyat
{"success":true,"data":{"id":12,"name":"Game Zone"}}
```

```json
// paginatsiyali muvaffaqiyat
{"success":true,"data":[],"meta":{"page":1,"limit":20,"total":0}}
```

```json
// xatolik
{"success":false,"error":{"code":"NOT_FOUND","message":"Club topilmadi"}}
```

HTTP kodlari: `200` ko‘rish; `201` yaratish; `204` tanasiz o‘chirish; `400` noto‘g‘ri qiymat; `401` kirish tasdiqlanmagan; `403` ruxsat yo‘q; `404` topilmadi; `409` konflikt; `429` cheklov; `500` ichki xato. Validation xatolari uchun bitta izchil format tanla.

### Config va skriptlar uchun talab

- `.env.example`: `NODE_ENV`, `PORT`, `DATABASE_URL`, `CORS_ORIGIN`, `TELEGRAM_BOT_TOKEN`, `JWT_*`, `LOG_LEVEL`, kelajakda storage sozlamalari.
- `.env` Git'ga tushmaydi; test va production uchun alohida qiymatlar.
- `npm run dev` — TS watcher; `npm run build` — TypeScript build; `npm run start` — build qilingan JS; `npm run typecheck`, `npm run lint`, `npm run test`, `npm run db:migrate`.
- `GET /api/health` — avvalgi endpoint saqlanadi; DB holati uchun alohida `GET /api/ready` qo‘shish mumkin (production siyosatiga mos).

---
