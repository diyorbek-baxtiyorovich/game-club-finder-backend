# GameClubFinder — Codex bilan bosqichma-bosqich ishlash

> **Asosiy qoida:** katta roadmapni Codex chatiga tashlamang. U loyiha ichidagi fayllarni kerak bo‘lganda o‘qisin.

## Fayllarni qayerga joylashtirish kerak?

ZIP'ni oching va uning ichidagi `AGENTS.md` hamda `docs/` papkasini **mavjud backend loyihangiz ildiziga** ko‘chiring.

Misol:

```text
Game_find back/
├── AGENTS.md
├── src/                       # mavjud kod o‘z holicha qoladi
├── package.json
├── tsconfig.json
└── docs/
    └── backend/
        ├── START_HERE.md
        ├── PROGRESS.md
        ├── DECISIONS.md
        ├── REFERENCE_ARCHITECTURE.md
        ├── REFERENCE_API_DB.md
        └── steps/
            ├── 00.md
            ├── 01.md
            ├── ...
            └── 20.md
```

**Diqqat:** loyihada oldindan `AGENTS.md` bo‘lsa, uning ichidagi mavjud qoidalarni o‘chirmang. Yangi qoidalarni unga birlashtiring.

## Codex'ga birinchi xabar

```text
GameClubFinder backend ustida ishlaymiz.
AGENTS.md qoidalariga amal qil.
Faqat docs/backend/PROGRESS.md va docs/backend/steps/00.md fayllarini o‘qi.
Mavjud kodni tekshir va faqat 00-bosqichni bajar.
Kerak bo‘lmasa qolgan roadmap/reference fayllarini ochma.
Natijani PROGRESS.md'ga yoz; keyingi bosqichga o‘tma.
```

## Keyingi safar (00-bosqich DONE bo‘lsa)

```text
AGENTS.md qoidalariga amal qil.
docs/backend/PROGRESS.md va docs/backend/steps/01.md ni o‘qi.
Faqat 01-bosqichni bajar. Mavjud kodga kerakli kichik o‘zgartirishlar qil.
Tekshirilgan natijalar asosida PROGRESS.md ni yangila.
02-bosqichga o‘tma.
```

Keyin faqat bosqich raqamini `02`, `03`, ... tarzida almashtirasiz. Chat yangidan ochilsa ham `PROGRESS.md` holatni saqlab qoladi.

## Ishlash tartibi

1. Birinchi navbatda `PROGRESS.md`dagi joriy bosqichni tekshiring.
2. Codex'ga faqat shu bosqichning raqamini bering.
3. Codex bitta `steps/XX.md`dagi vazifalarni bajaradi va tekshiradi.
4. `DONE` yoki `BLOCKED` sababi `PROGRESS.md`ga yoziladi.
5. Faqat `DONE`dan keyin navbatdagi bosqichga o‘tasiz.

## Token sarfini kamaytirish

- Butun eski `GameClubFinder_BACKEND_ROADMAP.md`ni **Codex'ga yubormang**.
- `BACKEND(1).md`, `DATABASE(1).md`, `DEVOPS(1).md`ni ham har safar to‘liq o‘qittirmang.
- Codex'ga bitta `steps/XX.md` va `PROGRESS.md` yetarli bo‘lsin; reference faqat zaruratda.
- Bir bosqich uchun ko‘p mayda savol yuborish o‘rniga, bosqich ichidagi qabul mezonlariga tayangan holda yakuniy hisobot oling.
- Katta loglarni chatga nusxalamang, muammoga oid qismini ko‘rsating.

## Ish holatlari

- `TODO` — hali boshlanmagan.
- `IN PROGRESS` — ish bajarilmoqda.
- `DONE` — sinov bilan tasdiqlangan.
- `BLOCKED` — bajarishga tashqi to‘siq bor (masalan, npm yoki PostgreSQL mavjud emas).

`20.md` MVP'dan keyingi imkoniyatlar uchun; hozircha undan kod yozishni boshlamang.
