import * as repository from "./search.repository.js";
import type { SearchBody } from "./search.schema.js";

export const searchService = {
  async search(filters: SearchBody) {
    return repository.searchClubs(filters);
  },
  filters: repository.getFilterOptions,
};
