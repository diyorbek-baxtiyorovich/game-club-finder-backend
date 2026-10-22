# GameClubFinder — Codex ish qoidalari

Bu fayl Node.js + TypeScript + Express backend loyihasi uchun. **Barcha roadmapni birdan o‘qimang.**

1. Har bir yangi vazifada avval `docs/backend/PROGRESS.md` va foydalanuvchi so‘ragan **bitta** `docs/backend/steps/XX.md`ni o‘qing.
2. So‘ng faqat shu bosqichga aloqador mavjud kod/fayllarni tekshiring. `REFERENCE_*.md` va asl `BACKEND/DATABASE/DEVOPS.md`ning faqat zarur bo‘limlarini oching; hammasini birdan o‘qimang.
3. Bosqich `XX-1` `DONE` bo‘lmasa `XX`ni boshlamang; to‘siqni qayd qiling.
4. Stackni saqlang: Node.js, TypeScript strict, Express 5, PostgreSQL + PostGIS; arxitektura Modular Monolith (routes/controller/service/repository/schema).
5. Mavjud kodni, konfiguratsiyani, `/api/health` endpointini buzib qayta yozmang. Keraksiz dependency, bo‘sh modul, mock biznes qoidasini qo‘shmang.
6. O‘rnatish/test/buildni real bajarib tekshiring; `PASS`ni faqat haqiqiy natijadan keyin yozing. Tarmoq, DB yoki huquq bo‘lmasa `BLOCKED` / `NOT RUN` deb belgilang.
7. Token, `.env`, maxfiy ma’lumotlarni logga yoki Git'ga chiqarmang. DB migrationlarni productionda o‘chirib qayta yaratmang.
8. Har bir bosqich yakunida faqat `docs/backend/PROGRESS.md`ni yangilang va qisqa hisobot bering. Keyingi bosqichni **avtomatik** boshlamang.
9. Qo‘shimcha arxitektura qarori kerak bo‘lsa `docs/backend/DECISIONS.md`ga yozing; hujjatda ochiq biznes savolini taxmin bilan yopmang.
10. `AGENTS.md` qisqa saqlansin; unga katta roadmapni ko‘chirmang.
