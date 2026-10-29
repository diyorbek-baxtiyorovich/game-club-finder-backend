# GameClubFinder — Ochiq qarorlar

Bu fayl tasdiqlangan qarorlar va ochiq masalalarni saqlaydi. Qaror qabul qilinmagan bo‘lsa, taxminan funksiyani to‘liq bajarildi deb belgilamang.

| Masala | Holat | Bosqich | Izoh |
|---|---|---|---|
| Club owner rolini kim beradi? | OPEN | 06–07 | Client o‘zini admin/owner deb belgilamasligi kerak |
| Faqat klubga borgan user review yozishi | BLOCKED | 13 | Tashrifni isbotlaydigan booking/check-in yo‘q; review “tasdiqlangan tashrif” deb belgilanmaydi va yozish hozircha tashrifga bog‘lanmagan |
| Real-time bandlik manbasi | OPEN | 15 | Jadval bo‘yicha ochiqlik hisoblanadi; sensor/club tizimi ulanmaguncha availability `occupancy: "unknown"` qaytaradi |
| Production media storage provayderi | OPEN | 14 | Development/test local diskdan foydalanadi. Production uchun object storage/CDN tanlanmagan; interface bor, production upload hozircha 503 bilan yopiq. Video provider/format tanlanmagani uchun video upload ochilmagan. |
| Hosting / CI provider | OPEN | 18 | Real production infra tanlangach moslash |
| Tasdiqlangan klubni tahrirlash qayta moderatsiyaga tushadimi? | OPEN | 07–09 | Hozir `approved` klubning nomi, manzili, tavsifi, joylashuvi va rasmlari egasi tomonidan o‘zgartirilsa darhol public bo‘ladi (review esa tahrirda `pending`ga qaytadi). Qaror kelguncha xulq o‘zgartirilmadi; har bir o‘zgarish `audit_events`da `club.updated` sifatida qayd etiladi. |
| Hard-delete (user/club) siyosati | OPEN | 16 | FK’lar aralash: favorites/history/sessions/reviews `CASCADE`, `club_ratings`, moderatsiya audit va `review_replies.owner_id` `RESTRICT`. Hozir faqat soft-delete ishlatiladi; GDPR-uslubida userni butunlay o‘chirish talab qilinsa, CASCADE / SET NULL / anonimlashtirish bo‘yicha qaror kerak. |
| Narxlarda bir nechta valyuta | OPEN | 08/11 | `club_pricing.currency` har qatorda bor, lekin narx sort/filtr valyutani hisobga olmaydi (5 USD < 50000 UZS). Bitta valyuta (UZS) majburiy qilinadimi yoki konvertatsiya kerakmi — qaror kerak. |
| Rad etilgan clubni qayta topshirish | OPEN | 09 | Moderatsiya faqat `pending → approved/rejected` o‘tishini qabul qiladi; qayta topshirish workflow’i biznes qarori kelguncha mavjud emas |

## Qabul qilingan qarorlar

- Backend: Node.js + TypeScript + Express.
- Arxitektura: Modular Monolith, qatlamlarga ajratilgan modullar.
- Baza: PostgreSQL + PostGIS.
- Club equipment va features bir klubga bir nechta yozuv sifatida saqlanadi; API ularni array ko‘rinishida qaytaradi.
- Club ish vaqti JSONB’da ISO hafta kunlari (`mon`–`sun`) va `HH:mm` intervallar ko‘rinishida; yopilish ochilishdan oldin bo‘lsa interval yarim tundan o‘tadi. Kun yo‘q yoki bo‘sh bo‘lsa yopiq; `00:00`–`00:00` 24/7 degani; ochilish vaqti inclusive, yopilish vaqti exclusive.
- Har club o‘zining IANA timezone qiymatini saqlaydi; yangi klublar uchun default `Asia/Tashkent`. Availability endpoint jadvaldan `isOpenNow` hisoblaydi, real bandlik manbai ulanmaguncha `occupancy`ni `unknown` qaytaradi. `openNow` qidiruvi club timezone’ini ishlatadi.
- Qidiruv reytingi `club_ratings` jadvalidagi 1–5 integer baholarning o‘rtachasi; bir user bitta clubga bitta baho bera oladi. Tashrifni tasdiqlash qarori ochiq qoladi; 11-bosqich faqat mavjud baholarni qidiruvda agregatsiya qiladi.
- Favorites faqat `approved` va `is_active=true` klublarga qo‘shiladi; qayta POST mavjud qatorni qaytaradi (200), yangi yozuv 201. Moderatsiyadan o‘tmagan yoki faol bo‘lmagan klub POST/detail’da 404, favorites/history ro‘yxatida yashiriladi. Yashirin klubni favorites’dan o‘chirishga ruxsat beriladi.
- History faqat JWT bilan muvaffaqiyatli ochilgan public club detail uchun yoziladi; anonim ko‘rish saqlanmaydi. Bir user–club juftligi bitta qator bo‘lib, takroriy ko‘rish `view_count` va `last_viewed_at`ni yangilaydi. Har user uchun oxirgi 90 kun va ko‘pi bilan 100 klub saqlanadi; eski/ortiqcha yozuvlar yangi ko‘rish yoki history o‘qishda tozalanadi.
- Review uchun mezonlar: performance, equipment, service, cleanliness, comfort va value for money; har biri butun 1–5. Yangi reviewning umumiy bali 6 mezon arifmetik o‘rtachasi, public klub o‘rtachasi esa har tasdiqlangan reviewning aniq o‘rtachasidan live hisoblanadi. Mavjud `club_ratings(user_id,club_id)` unique va rating qatorlari saqlanadi; eski mezonsiz ballar legacy reyting sifatida agregatga kiradi.
- Bir user bitta klubga bitta review yozadi. Yangi/tahrirlangan review `pending`; faqat admin `pending → approved/rejected` qiladi, rad etishda sabab kerak. Tasdiqlanmagan yoki flag qilingan review public ro‘yxat va rating agregatiga kirmaydi; tahrirlash moderatsiyani qayta boshlaydi. Review egasi uni o‘chirishi mumkin.
- Club egasi faqat o‘zining faol klubidagi tasdiqlangan reviewga bitta javob beradi; takroriy javob shu javobni yangilaydi. Foydali ovoz `(review_id,user_id)` unique; o‘z reviewiga ovoz berilmaydi. Ovoz soni alohida jadvaldan hisoblanadi.
- Statistikalar source table’lardan so‘rov paytida, yozuvsiz aggregate qilinadi. Club egasi faqat o‘z klubining saqlanib turgan `view_history.view_count`, favorites va public rating count/average qiymatlarini ko‘radi; history retention va 100-qator limiti sabab ko‘rish soni tarixiy to‘liq jami emas va API’da `storedHistory...` deb nomlanadi. Admin `activeLast30Days` — 30 kun ichida history, favorite, review yoki auth session yozuvi bor unikal userlar. Traffic oshsa, background/materialized aggregate alohida qaror bilan ko‘rib chiqiladi.
- `audit_events` actor, entity, action, changed field nomlari va status/role transition metadata’sini saqlaydi; club/review matni, manzil, Telegram ID va to‘liq row nusxasi saqlanmaydi. Eventlar append-only DB trigger bilan himoyalanadi. Role o‘zgarishi actor context’siz bajarilmaydi.
- Image upload development/test’da `var/media` local storage adapter orqali ishlaydi; production’da adapter tanlanmaguncha upload 503 beradi. Faqat JPEG/PNG/WebP, 8 MiB/fayl, jami 20 rasm/club. Nom UUID bilan yaratiladi; original filename ishlatilmaydi. `club_images`da URL, storage key, MIME, byte hajmi, kategoriya va display order saqlanadi. Video faqat storage va format qarori qabul qilingandan keyin qo‘shiladi.
- Redis/BullMQ, booking va payment: MVP boshlanishida shart emas.
- Klub profilini `PUT /clubs/:id` bilan yangilashdagi `images` massivi faqat URL orqali berilgan rasmlarni almashtiradi; yuklangan (storage_key bor) rasmlar saqlanib qoladi va faqat `DELETE /clubs/:id/images/:imageId` orqali o‘chiriladi. Sabab: eski forma `images: []` yuborsa, yuklangan muqova fayllari yo‘qolib ketardi.
- Klub sharhlari ro‘yxati (`GET /clubs/:id/reviews`) faqat klub `approved` va `is_active` bo‘lsa ochiladi, aks holda 404 — boshqa public endpointlar bilan bir xil.
- Ommaviy qidiruvdagi `q` matni ILIKE uchun escape qilinadi: `%` va `_` oddiy belgi sifatida qidiriladi.
- Review muallifi o‘z sharhini tahrirlaganda audit action `review.resubmitted`; admin qarori `review.moderated` bo‘lib qoladi (migration `1700000016000`).
- API reverse proxy ortida ishlaganda `TRUST_PROXY` proxy hop soniga teng qo‘yiladi (Compose’da nginx bilan `1`), proxysiz `0`. Productionda `TELEGRAM_BOT_TOKEN` va `JWT_ACCESS_SECRET` majburiy; `.env.example` namunalari hech qachon qabul qilinmaydi.
- Integratsion testlar faqat nomi `_test` bilan tugaydigan bazada ishga tushadi (`test/setup/db-guard.ts`).
