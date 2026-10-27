import { telegramIdSchema } from "./user.schema.js";
import * as usersRepository from "./users.repository.js";

export const usersService = {
  findByTelegramId(telegramId: string) {
    return usersRepository.findByTelegramId(telegramIdSchema.parse(telegramId));
  },
  findById(userId: string) {
    return usersRepository.findById(userId);
  },
  upsertByTelegramId(telegramId: string) {
    return usersRepository.createUser(telegramIdSchema.parse(telegramId));
  },
};
