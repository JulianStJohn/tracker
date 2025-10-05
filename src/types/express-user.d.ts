import type { JWTPayload } from "jose";

declare global {
  declare module "express-serve-static-core" {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export {}; 