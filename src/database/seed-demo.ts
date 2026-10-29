// Demo data for local frontend development: `npm run db:seed:demo`.
// Safe to re-run: clubs are upserted by slug (all start with "demo-") and their
// child rows are replaced. Refuses to run with NODE_ENV=production.
import type { PoolClient } from "pg";
import { logger } from "../common/logger.js";
import { databasePool, withTransaction } from "../config/database.js";
import { env } from "../config/env.js";

type Role = "user" | "club_owner" | "admin";
type Hours = Record<string, Array<{ open: string; close: string }>>;

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const everyDay = (open: string, close: string): Hours =>
  Object.fromEntries(DAYS.map((day) => [day, [{ open, close }]]));
const weekdaysAndWeekend = (weekday: [string, string], weekend: [string, string]): Hours =>
  Object.fromEntries(
    DAYS.map((day) => {
      const [open, close] = day === "sat" || day === "sun" ? weekend : weekday;
      return [day, [{ open, close }]];
    }),
  );

// Same telegram ids as src/modules/auth/dev-auth.ts, so AUTH_DISABLED users see this data.
const DEV_USERS = { admin: "900000000001", clubOwner: "900000000002", user: "900000000003" } as const;
const DEMO_OWNERS = ["910000000001", "910000000002", "910000000003"];
const DEMO_REVIEWERS = Array.from({ length: 8 }, (_, index) => `9100000001${String(index + 1).padStart(2, "0")}`);

interface DemoClub {
  slug: string;
  name: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  description: string;
  owner: "dev" | number;
  status: "approved" | "pending" | "rejected";
  hours: Hours;
  equipment: Array<[name: string, hz: number, cpu: string, gpu: string, ram: number]>;
  rooms: string[];
  services: string[];
  pricing: Array<[category: "standard" | "vip" | "console", name: string, price: number, discount?: number]>;
  games: string[];
  reviews: Array<{ scores: [number, number, number, number, number, number]; body: string; status?: "approved" | "pending"; reply?: string }>;
}

const clubs: DemoClub[] = [
  {
    slug: "demo-cyberarena-chilonzor", name: "CyberArena Chilonzor", city: "Tashkent",
    address: "Chilonzor tumani, Bunyodkor shoh ko‘chasi 12", lat: 41.2856, lng: 69.2044, owner: "dev", status: "approved",
    description: "Chilonzordagi eng katta kompyuter klubi: 60 ta o‘yin kompyuteri, alohida VIP zona va turnir sahnasi.",
    hours: everyDay("00:00", "00:00"),
    equipment: [["Standard zal", 165, "Intel Core i5-13400F", "RTX 4060", 16], ["VIP zona", 240, "Intel Core i7-14700K", "RTX 4070 Super", 32]],
    rooms: ["standard", "vip_zone", "bootcamp"], services: ["wifi", "parking", "snacks", "drinks"],
    pricing: [["standard", "Standard soat", 15000], ["vip", "VIP soat", 30000], ["standard", "Tungi paket (22:00–08:00)", 60000, 20]],
    games: ["cs2", "dota2", "valorant", "gta5"],
    reviews: [
      { scores: [5, 5, 4, 5, 4, 5], body: "Kompyuterlar juda tez, 240 Hz monitorlarda CS2 o‘ynash zo‘r.", reply: "Rahmat! Yana kutib qolamiz." },
      { scores: [4, 4, 4, 3, 4, 5], body: "Narxi arzon, lekin kechqurun odam ko‘p bo‘ladi." },
      { scores: [5, 4, 5, 5, 5, 4], body: "VIP zona tinch va qulay, xodimlar xushmuomala." },
    ],
  },
  {
    slug: "demo-pixel-hub-yunusobod", name: "Pixel Hub Yunusobod", city: "Tashkent",
    address: "Yunusobod tumani, Amir Temur shoh ko‘chasi 108", lat: 41.3653, lng: 69.2869, owner: "dev", status: "approved",
    description: "Zamonaviy dizayn, PlayStation 5 xonalari va do‘stlar uchun alohida bootcamp xonasi.",
    hours: everyDay("10:00", "02:00"),
    equipment: [["PC zal", 144, "AMD Ryzen 5 7600", "RTX 4060 Ti", 16], ["PS5 xonasi", 120, "PlayStation 5", "PlayStation 5", 16]],
    rooms: ["standard", "console_room", "bootcamp"], services: ["wifi", "drinks", "air_conditioning"],
    pricing: [["standard", "Standard soat", 14000], ["console", "PS5 xona (soat)", 35000], ["vip", "Bootcamp 5 kishi", 90000, 10]],
    games: ["cs2", "valorant", "lol"],
    reviews: [
      { scores: [4, 5, 4, 4, 5, 4], body: "PS5 xonasi do‘stlar bilan FIFA o‘ynash uchun juda yaxshi." },
      { scores: [3, 3, 4, 4, 3, 4], body: "Ba’zi kompyuterlarda quloqchinlar eski.", status: "pending" },
    ],
  },
  {
    slug: "demo-gamezone-mirzo-ulugbek", name: "GameZone Mirzo Ulug‘bek", city: "Tashkent",
    address: "Mirzo Ulug‘bek tumani, Buyuk Ipak yo‘li 45", lat: 41.3302, lng: 69.3341, owner: 0, status: "approved",
    description: "Talabalar uchun qulay narxlar va kunduzgi chegirmalar.",
    hours: weekdaysAndWeekend(["09:00", "23:00"], ["09:00", "03:00"]),
    equipment: [["Asosiy zal", 144, "Intel Core i5-12400F", "RTX 3060", 16]],
    rooms: ["standard"], services: ["wifi", "snacks", "student_discount"],
    pricing: [["standard", "Standard soat", 12000], ["standard", "Kunduzgi (09:00–14:00)", 9000, 25]],
    games: ["cs2", "dota2", "lol"],
    reviews: [
      { scores: [4, 3, 4, 4, 3, 5], body: "Talaba sifatida narxi juda mos keladi." },
      { scores: [3, 3, 3, 4, 3, 5], body: "Kompyuterlar o‘rtacha, lekin Dota uchun yetarli." },
    ],
  },
  {
    slug: "demo-respawn-sergeli", name: "Respawn Sergeli", city: "Tashkent",
    address: "Sergeli tumani, Yangi Sergeli ko‘chasi 7", lat: 41.2251, lng: 69.2236, owner: 0, status: "approved",
    description: "Sergelidagi 24/7 ishlaydigan klub, katta ekranli turnir zonasi bilan.",
    hours: everyDay("00:00", "00:00"),
    equipment: [["Standard", 165, "AMD Ryzen 5 5600", "RTX 3060 Ti", 16], ["Pro zona", 360, "AMD Ryzen 7 7800X3D", "RTX 4080 Super", 32]],
    rooms: ["standard", "vip_zone", "tournament_stage"], services: ["wifi", "parking", "drinks", "streaming_setup"],
    pricing: [["standard", "Standard soat", 13000], ["vip", "Pro zona soat", 35000]],
    games: ["cs2", "valorant", "dota2"],
    reviews: [
      { scores: [5, 5, 4, 4, 4, 4], body: "360 Hz monitorlar — Valorant uchun eng yaxshi joy.", reply: "Turnirlarimizga ham keling!" },
      { scores: [4, 4, 3, 3, 4, 4], body: "Tunda ham ochiq, bu katta plus." },
      { scores: [5, 5, 5, 4, 5, 3], body: "Pro zona qimmatroq, lekin bunga arziydi." },
    ],
  },
  {
    slug: "demo-nexus-mirobod", name: "Nexus Mirobod", city: "Tashkent",
    address: "Mirobod tumani, Nukus ko‘chasi 23", lat: 41.2934, lng: 69.2731, owner: 1, status: "approved",
    description: "Shahar markazida premium klub: har bir o‘rinda ergonomik kreslo va mexanik klaviatura.",
    hours: everyDay("11:00", "04:00"),
    equipment: [["Premium zal", 240, "Intel Core i7-13700F", "RTX 4070", 32]],
    rooms: ["vip_zone", "bootcamp"], services: ["wifi", "drinks", "snacks", "air_conditioning", "parking"],
    pricing: [["vip", "Premium soat", 28000], ["vip", "Bootcamp 5 kishi", 120000, 15]],
    games: ["cs2", "valorant", "lol", "gta5"],
    reviews: [
      { scores: [5, 5, 5, 5, 5, 4], body: "Juda toza va tinch, markazda qulay joylashgan." },
      { scores: [4, 5, 4, 5, 5, 3], body: "Sifat a’lo, narxi biroz baland." },
    ],
  },
  {
    slug: "demo-arena-x-yakkasaroy", name: "Arena X Yakkasaroy", city: "Tashkent",
    address: "Yakkasaroy tumani, Shota Rustaveli ko‘chasi 56", lat: 41.2865, lng: 69.2512, owner: 1, status: "approved",
    description: "Konsol va PC birgalikda: Xbox Series X, PS5 va 40 ta kompyuter.",
    hours: everyDay("10:00", "00:00"),
    equipment: [["PC zal", 165, "Intel Core i5-13400F", "RTX 4060", 16], ["Konsol zona", 120, "Xbox Series X", "Xbox Series X", 16]],
    rooms: ["standard", "console_room"], services: ["wifi", "snacks"],
    pricing: [["standard", "Standard soat", 15000], ["console", "Konsol soat", 30000]],
    games: ["gta5", "cs2", "dota2"],
    reviews: [{ scores: [4, 4, 4, 4, 4, 4], body: "Hamma narsa yaxshi, o‘rtacha klub." }],
  },
  {
    slug: "demo-headshot-olmazor", name: "HeadShot Olmazor", city: "Tashkent",
    address: "Olmazor tumani, Qorasaroy ko‘chasi 31", lat: 41.3489, lng: 69.2189, owner: 2, status: "approved",
    description: "CS2 ixlosmandlari uchun: har hafta ichki turnirlar va reyting jadvali.",
    hours: everyDay("09:00", "01:00"),
    equipment: [["CS zal", 240, "AMD Ryzen 5 7600X", "RTX 4060 Ti", 32]],
    rooms: ["standard", "tournament_stage"], services: ["wifi", "drinks", "tournaments"],
    pricing: [["standard", "Standard soat", 16000], ["standard", "5 soatlik paket", 70000, 12.5]],
    games: ["cs2", "valorant"],
    reviews: [
      { scores: [5, 5, 4, 4, 4, 5], body: "Haftalik turnirlar juda qiziqarli!" },
      { scores: [4, 5, 3, 3, 4, 4], body: "Monitorlar zo‘r, lekin hojatxona tozaligi yaxshilansin." },
    ],
  },
  {
    slug: "demo-level-up-shayxontohur", name: "Level Up Shayxontohur", city: "Tashkent",
    address: "Shayxontohur tumani, Navoiy ko‘chasi 14", lat: 41.3247, lng: 69.2387, owner: 2, status: "approved",
    description: "Oilaviy muhit, bolalar uchun alohida konsol burchagi.",
    hours: weekdaysAndWeekend(["10:00", "22:00"], ["10:00", "00:00"]),
    equipment: [["Asosiy zal", 144, "Intel Core i3-12100F", "RTX 3050", 16]],
    rooms: ["standard", "console_room"], services: ["wifi", "snacks", "kids_corner"],
    pricing: [["standard", "Standard soat", 10000], ["console", "Konsol soat", 20000]],
    games: ["gta5", "lol"],
    reviews: [{ scores: [3, 3, 4, 4, 4, 5], body: "Bolalar bilan borish uchun qulay, arzon." }],
  },
  {
    slug: "demo-samarkand-legends", name: "Samarkand Legends", city: "Samarkand",
    address: "Samarqand, Rudakiy ko‘chasi 88", lat: 39.6542, lng: 66.9597, owner: 0, status: "approved",
    description: "Samarqanddagi eng zamonaviy o‘yin klubi, Registon yaqinida.",
    hours: everyDay("10:00", "02:00"),
    equipment: [["Standard", 165, "AMD Ryzen 5 5600X", "RTX 3070", 16], ["VIP", 240, "Intel Core i7-12700F", "RTX 4070", 32]],
    rooms: ["standard", "vip_zone"], services: ["wifi", "parking", "drinks"],
    pricing: [["standard", "Standard soat", 12000], ["vip", "VIP soat", 25000]],
    games: ["cs2", "dota2", "valorant"],
    reviews: [
      { scores: [5, 4, 5, 4, 4, 5], body: "Samarqandda bunaqasi yo‘q edi, rahmat!" },
      { scores: [4, 4, 4, 5, 4, 4], body: "Yaxshi joy, VIP zona keng." },
    ],
  },
  {
    slug: "demo-bukhara-cyber-oasis", name: "Bukhara Cyber Oasis", city: "Bukhara",
    address: "Buxoro, Muhammad Iqbol ko‘chasi 5", lat: 39.7681, lng: 64.4556, owner: 1, status: "approved",
    description: "Buxorodagi qulay klub: kuchli kompyuterlar va mehmondo‘st xodimlar.",
    hours: everyDay("09:00", "00:00"),
    equipment: [["Asosiy zal", 144, "Intel Core i5-12400F", "RTX 3060", 16]],
    rooms: ["standard"], services: ["wifi", "drinks"],
    pricing: [["standard", "Standard soat", 10000]],
    games: ["dota2", "cs2"],
    reviews: [{ scores: [4, 4, 5, 4, 4, 5], body: "Xodimlar juda yordam beradi, narx arzon." }],
  },
  {
    slug: "demo-namangan-game-point", name: "Namangan Game Point", city: "Namangan",
    address: "Namangan, Uychi ko‘chasi 17", lat: 40.9983, lng: 71.6726, owner: 2, status: "pending",
    description: "Yangi ochilgan klub — moderatsiya kutilmoqda.",
    hours: everyDay("10:00", "23:00"),
    equipment: [["Asosiy zal", 165, "AMD Ryzen 5 5600", "RTX 4060", 16]],
    rooms: ["standard"], services: ["wifi"],
    pricing: [["standard", "Standard soat", 11000]],
    games: ["cs2", "dota2"],
    reviews: [],
  },
  {
    slug: "demo-night-owl-uchtepa", name: "Night Owl Uchtepa", city: "Tashkent",
    address: "Uchtepa tumani, Lutfiy ko‘chasi 3", lat: 41.2967, lng: 69.1789, owner: 0, status: "rejected",
    description: "Rad etilgan ariza namunasi (moderatsiya ekranlari uchun).",
    hours: everyDay("18:00", "06:00"),
    equipment: [["Zal", 144, "Intel Core i5-10400F", "GTX 1660 Super", 16]],
    rooms: ["standard"], services: ["wifi"],
    pricing: [["standard", "Tungi soat", 9000]],
    games: ["cs2"],
    reviews: [],
  },
];

async function upsertUser(client: PoolClient, telegramId: string, role: Role): Promise<string> {
  const result = await client.query<{ id: string }>(
    `WITH inserted AS (
       INSERT INTO users (telegram_id, role) VALUES ($1, $2)
       ON CONFLICT (telegram_id) DO NOTHING RETURNING id
     )
     SELECT id::text FROM inserted UNION ALL SELECT id::text FROM users WHERE telegram_id = $1 LIMIT 1`,
    [telegramId, role],
  );
  return result.rows[0].id;
}

async function seedDemo(client: PoolClient) {
  const adminId = await upsertUser(client, DEV_USERS.admin, "admin");
  const devOwnerId = await upsertUser(client, DEV_USERS.clubOwner, "club_owner");
  const devUserId = await upsertUser(client, DEV_USERS.user, "user");
  const ownerIds = await Promise.all(DEMO_OWNERS.map((id) => upsertUser(client, id, "club_owner")));
  const reviewerIds: string[] = [];
  for (const id of DEMO_REVIEWERS) reviewerIds.push(await upsertUser(client, id, "user"));
  await client.query("SELECT set_config('app.actor_user_id', $1, true)", [adminId]);

  const gameRows = await client.query<{ id: string; slug: string }>("SELECT id::text, slug FROM games");
  const gameIds = new Map(gameRows.rows.map((row) => [row.slug, row.id]));
  if (gameIds.size === 0) throw new Error("O‘yinlar katalogi bo‘sh: avval `npm run db:seed` ni ishga tushiring.");

  const clubIds: string[] = [];
  let reviewCount = 0;
  for (const club of clubs) {
    const ownerId = club.owner === "dev" ? devOwnerId : ownerIds[club.owner];
    const saved = await client.query<{ id: string }>(
      `INSERT INTO game_clubs (owner_id, name, slug, description, address, city, location, status, working_hours, timezone, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,ST_SetSRID(ST_MakePoint($7,$8),4326)::geography,$9,$10::jsonb,'Asia/Tashkent',true)
       ON CONFLICT (slug) DO UPDATE SET owner_id=EXCLUDED.owner_id, name=EXCLUDED.name, description=EXCLUDED.description,
         address=EXCLUDED.address, city=EXCLUDED.city, location=EXCLUDED.location, status=EXCLUDED.status,
         working_hours=EXCLUDED.working_hours, is_active=true, updated_at=current_timestamp
       RETURNING id::text`,
      [ownerId, club.name, club.slug, club.description, club.address, club.city, club.lng, club.lat, club.status, JSON.stringify(club.hours)],
    );
    const clubId = saved.rows[0].id;
    clubIds.push(clubId);

    for (const table of ["club_equipment", "club_features", "club_pricing", "club_games", "club_ratings"]) {
      await client.query(`DELETE FROM ${table} WHERE club_id = $1`, [clubId]);
    }
    await client.query("DELETE FROM club_images WHERE club_id = $1 AND storage_key IS NULL", [clubId]);

    for (const [name, hz, cpu, gpu, ram] of club.equipment) {
      await client.query(
        "INSERT INTO club_equipment (club_id,name,monitor_hz,cpu,gpu,ram_gb) VALUES ($1,$2,$3,$4,$5,$6)",
        [clubId, name, hz, cpu, gpu, ram],
      );
    }
    for (const [category, names] of [["room_type", club.rooms], ["service", club.services]] as const) {
      for (const name of names) {
        await client.query("INSERT INTO club_features (club_id,category,name) VALUES ($1,$2,$3)", [clubId, category, name]);
      }
    }
    for (const [category, name, price, discount] of club.pricing) {
      await client.query(
        "INSERT INTO club_pricing (club_id,category,name,hourly_price,discount_percent,currency) VALUES ($1,$2,$3,$4,$5,'UZS')",
        [clubId, category, name, price, discount ?? null],
      );
    }
    for (const slug of club.games) {
      const gameId = gameIds.get(slug);
      if (gameId) await client.query("INSERT INTO club_games (club_id,game_id) VALUES ($1,$2)", [clubId, gameId]);
    }
    const imageKinds = ["cover", "interior", "equipment"] as const;
    for (const [order, category] of imageKinds.entries()) {
      await client.query(
        `INSERT INTO club_images (club_id,image_url,alt_text,sort_order,display_order,image_category)
         VALUES ($1,$2,$3,$4,$4,$5)`,
        [clubId, `https://picsum.photos/seed/${club.slug}-${category}/1200/800`, `${club.name} — ${category}`, order, category],
      );
    }

    for (const [index, review] of club.reviews.entries()) {
      const userId = reviewerIds[index % reviewerIds.length];
      const [performance, equipment, service, cleanliness, comfort, value] = review.scores;
      const overall = Math.round(review.scores.reduce((sum, score) => sum + score, 0) / review.scores.length);
      await client.query(
        `INSERT INTO club_ratings (club_id,user_id,rating,performance,equipment,service,cleanliness,comfort,value_for_money)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [clubId, userId, overall, performance, equipment, service, cleanliness, comfort, value],
      );
      const status = review.status ?? "approved";
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO reviews (club_id,user_id,body,status,moderated_by,moderated_at,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6, current_timestamp - ($7 || ' days')::interval, current_timestamp - ($7 || ' days')::interval)
         RETURNING id::text`,
        [clubId, userId, review.body, status, status === "approved" ? adminId : null, status === "approved" ? new Date() : null, String(index * 3 + 1)],
      );
      if (review.reply) {
        await client.query("INSERT INTO review_replies (review_id,owner_id,body) VALUES ($1,$2,$3)", [inserted.rows[0].id, ownerId, review.reply]);
      }
      reviewCount += 1;
    }

    if (club.status === "rejected") {
      const existing = await client.query("SELECT 1 FROM game_club_moderation_audit WHERE club_id = $1", [clubId]);
      if (!existing.rowCount) {
        await client.query(
          `INSERT INTO game_club_moderation_audit (club_id,moderator_id,old_status,new_status,reason)
           VALUES ($1,$2,'pending','rejected',$3)`,
          [clubId, adminId, "Manzil va rasmlar tasdiqlanmadi. Iltimos, haqiqiy rasmlarni yuklang."],
        );
      }
    }
  }

  // Dev "user" (X-Dev-Role: user) gets a few favorites and some viewing history.
  const publicIds = clubIds.filter((_, index) => clubs[index].status === "approved");
  for (const clubId of publicIds.slice(0, 3)) {
    await client.query("INSERT INTO favorites (user_id,club_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [devUserId, clubId]);
  }
  for (const [index, clubId] of publicIds.slice(0, 5).entries()) {
    await client.query(
      `INSERT INTO view_history (user_id,club_id,view_count,first_viewed_at,last_viewed_at)
       VALUES ($1,$2,$3,current_timestamp - interval '7 days',current_timestamp - ($4 || ' hours')::interval)
       ON CONFLICT (user_id,club_id) DO UPDATE SET view_count=EXCLUDED.view_count,last_viewed_at=EXCLUDED.last_viewed_at`,
      [devUserId, clubId, index + 1, String(index * 5 + 1)],
    );
  }

  return { clubs: clubIds.length, approved: publicIds.length, reviews: reviewCount };
}

if (env.nodeEnv === "production") {
  logger.error("Demo ma’lumotlar productionda yozilmaydi.");
  process.exitCode = 1;
} else {
  try {
    const summary = await withTransaction(seedDemo);
    logger.info(summary, "Demo ma’lumotlar bazaga yozildi");
  } catch (error) {
    logger.error({ err: error }, "Demo ma’lumotlarni yozib bo‘lmadi");
    process.exitCode = 1;
  } finally {
    await databasePool.end();
  }
}
