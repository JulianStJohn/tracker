
import { Router, type Request, type Response, type NextFunction } from "express";

import * as config from "./config.js"

export function makeCorsRouter(): Router {
  const r = Router();
  
  r.use((req, res, next) => {
    const origin = req.headers.origin;
    /*
    if (origin === config.CHROME_EXTENSION_ORIGIN) {
      res.header("Access-Control-Allow-Origin", config.CHROME_EXTENSION_ORIGIN);
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Vary", "Origin");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,PUT,OPTIONS");
      if (req.method === "OPTIONS") return res.sendStatus(204);
    }
      */
    next();
  });

  return r;
}
