import assert from "node:assert/strict";
import { test } from "node:test";

import { gameSchema } from "../src/modules/catalogs/games/game.schema.js";
import { clubInputSchema } from "../src/modules/clubs/club.schema.js";
import { nearbyRequestSchema } from "../src/modules/discovery/nearby.schema.js";
import { searchRequestSchema } from "../src/modules/discovery/search.schema.js";
import {
  favoriteClubRequestSchema,
  favoritesListRequestSchema,
} from "../src/modules/favorites/favorites.schema.js";
import { historyListRequestSchema } from "../src/modules/history/history.schema.js";
import { mediaClubIdRequestSchema } from "../src/modules/media/media.schema.js";
import { changeClubStatusRequestSchema } from "../src/modules/moderation/moderation.schema.js";
import { createReviewRequestSchema } from "../src/modules/reviews/reviews.schema.js";
import { auditListRequestSchema } from "../src/modules/statistics/statistics.schema.js";
import {
  telegramIdSchema,
  userSchema,
} from "../src/modules/users/user.schema.js";

test("games and user schemas accept valid catalog/user data and reject invalid identifiers", () => {
  assert.equal(
    gameSchema.safeParse({
      id: "1",
      slug: "cs2",
      name: "Counter-Strike 2",
      isPopular: true,
      sortOrder: 1,
    }).success,
    true,
  );
  assert.equal(
    gameSchema.safeParse({
      id: "x",
      slug: "",
      name: "Game",
      isPopular: true,
      sortOrder: 1,
    }).success,
    false,
  );
  assert.equal(telegramIdSchema.safeParse("123456").success, true);
  assert.equal(telegramIdSchema.safeParse("0").success, false);
  assert.equal(
    userSchema.safeParse({
      id: "1",
      telegramId: "123456",
      role: "club_owner",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }).success,
    true,
  );
});

test("club input validates coordinates, profile fields and IANA timezone", () => {
  const valid = {
    name: "Club",
    slug: "club-1",
    address: "Tashkent",
    location: { lng: 69.2, lat: 41.3 },
    timezone: "Asia/Tashkent",
  };
  assert.equal(clubInputSchema.safeParse(valid).success, true);
  assert.equal(
    clubInputSchema.safeParse({ ...valid, location: { lng: 181, lat: 41.3 } })
      .success,
    false,
  );
  assert.equal(
    clubInputSchema.safeParse({ ...valid, timezone: "Not/A_Zone" }).success,
    false,
  );
});

test("nearby and search schemas reject invalid coordinates and contradictory filters", () => {
  assert.equal(
    nearbyRequestSchema.safeParse({
      params: {},
      query: { lat: "41.3", lng: "69.2" },
    }).success,
    true,
  );
  assert.equal(
    nearbyRequestSchema.safeParse({
      params: {},
      query: { lat: "91", lng: "69.2" },
    }).success,
    false,
  );
  assert.equal(
    searchRequestSchema.safeParse({
      params: {},
      query: {},
      body: { location: { lat: 91, lng: 69, radiusMeters: 5000 } },
    }).success,
    false,
  );
  assert.equal(
    searchRequestSchema.safeParse({
      params: {},
      query: {},
      body: {
        city: "Tashkent",
        location: { lat: 41.3, lng: 69.2, radiusMeters: 5000 },
      },
    }).success,
    false,
  );
});

test("favorites/history pagination and media ids enforce positive database ids", () => {
  assert.equal(
    favoritesListRequestSchema.safeParse({
      params: {},
      query: { page: "2", limit: "30" },
    }).success,
    true,
  );
  assert.equal(
    favoritesListRequestSchema.safeParse({
      params: {},
      query: { limit: "101" },
    }).success,
    false,
  );
  assert.equal(
    favoriteClubRequestSchema.safeParse({ params: { clubId: "3" }, query: {} })
      .success,
    true,
  );
  assert.equal(
    favoriteClubRequestSchema.safeParse({ params: { clubId: "0" }, query: {} })
      .success,
    false,
  );
  assert.equal(
    historyListRequestSchema.safeParse({ params: {}, query: {} }).success,
    true,
  );
  assert.equal(
    mediaClubIdRequestSchema.safeParse({ params: { id: "12" }, query: {} })
      .success,
    true,
  );
  assert.equal(
    mediaClubIdRequestSchema.safeParse({ params: { id: "-1" }, query: {} })
      .success,
    false,
  );
});

test("moderation and review schemas enforce rejection reasons and score bounds", () => {
  const moderation = {
    params: { id: "2" },
    query: {},
    body: { status: "rejected" },
  };
  assert.equal(
    changeClubStatusRequestSchema.safeParse(moderation).success,
    false,
  );
  assert.equal(
    changeClubStatusRequestSchema.safeParse({
      ...moderation,
      body: { ...moderation.body, reason: "Duplicate" },
    }).success,
    true,
  );
  const scores = {
    performance: 4,
    equipment: 4,
    service: 4,
    cleanliness: 4,
    comfort: 4,
    valueForMoney: 4,
    body: "Good place",
  };
  assert.equal(
    createReviewRequestSchema.safeParse({
      params: { id: "1" },
      query: {},
      body: scores,
    }).success,
    true,
  );
  assert.equal(
    createReviewRequestSchema.safeParse({
      params: { id: "1" },
      query: {},
      body: { ...scores, performance: 6 },
    }).success,
    false,
  );
});

test("audit list validates requested limit range and supplies a default", () => {
  const defaults = auditListRequestSchema.safeParse({ params: {}, query: {} });
  assert.equal(defaults.success, true);
  if (defaults.success) assert.equal(defaults.data.query.limit, 50);
  assert.equal(
    auditListRequestSchema.safeParse({ params: {}, query: { limit: "101" } })
      .success,
    false,
  );
});
