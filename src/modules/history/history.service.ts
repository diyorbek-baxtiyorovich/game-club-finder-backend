import * as repository from "./history.repository.js";
import type { HistoryListQuery } from "./history.schema.js";

export const historyService = {
  recordView: repository.recordView,
  async list(userId: string, query: HistoryListQuery) {
    return { ...await repository.listHistory(userId, query), ...query };
  },
};
