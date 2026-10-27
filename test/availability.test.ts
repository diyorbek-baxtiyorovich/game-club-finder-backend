import assert from "node:assert/strict";
import { test } from "node:test";
import { isOpenAt } from "../src/modules/clubs/availability.js";

test("overnight 09:00–02:00 hours include opening and exclude closing boundary", () => {
  const hours = { fri: [{ open: "09:00", close: "02:00" }] };
  assert.equal(
    isOpenAt(hours, "Asia/Tashkent", new Date("2026-01-09T04:00:00Z")),
    true,
  );
  assert.equal(
    isOpenAt(hours, "Asia/Tashkent", new Date("2026-01-09T20:59:00Z")),
    true,
  );
  assert.equal(
    isOpenAt(hours, "Asia/Tashkent", new Date("2026-01-09T21:00:00Z")),
    false,
  );
});

test("overnight Sunday hours carry into Monday", () => {
  const hours = { sun: [{ open: "20:00", close: "02:00" }] };
  assert.equal(
    isOpenAt(hours, "Asia/Tashkent", new Date("2026-01-04T20:30:00Z")),
    true,
  );
  assert.equal(
    isOpenAt(hours, "Asia/Tashkent", new Date("2026-01-04T21:00:00Z")),
    false,
  );
});

test("00:00–00:00 represents 24/7 and an empty schedule is closed", () => {
  assert.equal(
    isOpenAt(
      { mon: [{ open: "00:00", close: "00:00" }] },
      "Asia/Tashkent",
      new Date("2026-01-05T15:45:00Z"),
    ),
    true,
  );
  assert.equal(
    isOpenAt({}, "Asia/Tashkent", new Date("2026-01-05T15:45:00Z")),
    false,
  );
});

test("opening hours use the club timezone", () => {
  const hours = { mon: [{ open: "09:00", close: "10:00" }] };
  const instant = new Date("2026-01-05T14:30:00Z");
  assert.equal(isOpenAt(hours, "Asia/Tashkent", instant), false);
  assert.equal(isOpenAt(hours, "America/New_York", instant), true);
});
