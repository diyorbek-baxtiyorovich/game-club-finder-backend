import assert from "node:assert/strict";
import { test } from "node:test";

import { AppError } from "../src/common/errors/app-error.js";
import { moderationService } from "../src/modules/moderation/moderation.service.js";
import { reviewsService } from "../src/modules/reviews/reviews.service.js";
import type { AuthenticatedUser } from "../src/modules/auth/auth.types.js";

const user: AuthenticatedUser = { id: "10", role: "user" };
const owner: AuthenticatedUser = { id: "11", role: "club_owner" };
const expectForbidden = (action: Promise<unknown>) =>
  assert.rejects(
    action,
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === 403 &&
      error.code === "FORBIDDEN",
  );
const forbidden = (error: unknown) =>
  error instanceof AppError &&
  error.statusCode === 403 &&
  error.code === "FORBIDDEN";

test("review service enforces writer, owner-reply, and admin moderation roles before repository access", async () => {
  assert.throws(
    () =>
      reviewsService.create(owner, "1", {
        performance: 5,
        equipment: 5,
        service: 5,
        cleanliness: 5,
        comfort: 5,
        valueForMoney: 5,
        body: "Review",
      }),
    forbidden,
  );
  assert.throws(
    () => reviewsService.reply(user, "1", "Owner response"),
    forbidden,
  );
  assert.throws(
    () => reviewsService.moderate(owner, "1", "approved"),
    forbidden,
  );
});

test("moderation service denies non-admin actors before repository access", async () => {
  await expectForbidden(
    moderationService.changeStatus(user, "1", { status: "approved" }),
  );
});
