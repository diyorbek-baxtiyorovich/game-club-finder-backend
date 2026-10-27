import type { User } from "../users/user.schema.js";

export interface AuthenticatedUser {
  id: string;
  role: User["role"];
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedUser;
    }
  }
}

export {};
