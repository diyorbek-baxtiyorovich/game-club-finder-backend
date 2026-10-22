# GameClubFinder — Ochiq qarorlar

Bu fayl tasdiqlangan qarorlar va ochiq masalalarni saqlaydi. Qaror qabul qilinmagan bo‘lsa, taxminan funksiyani to‘liq bajarildi deb belgilamang.

| Masala | Holat | Bosqich | Izoh |
|---|---|---|---|
| Club owner rolini kim beradi? | OPEN | 06–07 | Client o‘zini admin/owner deb belgilamasligi kerak |
| Tashrifni isbotlash | OPEN | 13 | Haqiqiy tashrif bo‘lmasa 'verified visitor' deb ko‘rsatmaslik |
| Real-time bandlik manbasi | OPEN | 15 | Jadvaldagi ochiq/yopiq bilan bandlikni aralashtirmaslik |
| Media saqlash provayderi | OPEN | 14 | Dev local, production obyekt storage bo‘lishi mumkin |
| Hosting / CI provider | OPEN | 18 | Real production infra tanlangach moslash |

## Qabul qilingan qarorlar

- Backend: Node.js + TypeScript + Express.
- Arxitektura: Modular Monolith, qatlamlarga ajratilgan modullar.
- Baza: PostgreSQL + PostGIS.
- Redis/BullMQ, booking va payment: MVP boshlanishida shart emas.
