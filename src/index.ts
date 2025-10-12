import express, { Request, Response, NextFunction } from "express";
import * as http from "http"
import * as https from "https"
import { MongoClient, Db, Collection, Document } from "mongodb";
import path from "node:path";
import crypto from "node:crypto";
import cookieParser from "cookie-parser";
import * as oc from "openid-client";
import { createRemoteJWKSet, jwtVerify, errors, type JWTPayload } from "jose";
import util from "node:util";
// import type { Tag } from "./types/collections.d.ts"
import * as config from "./config.js"
import { MongoStore } from "./mongo.js"
import *  as auth from "./auth.js"
import * as cors from "./cors.js"
import { makeDayRouter } from "./day.js"
import { makeFoodRouter } from "./food.js"
import { makeMealRouter } from "./meals.js"
import { makeRecipeRouter } from "./recipes.js"
import { makeProgressRouter } from "./progress.js"
import * as fs from 'fs'

let openid_client_config: oc.Configuration;
let jwks: ReturnType<typeof createRemoteJWKSet>;

const mongo : MongoStore = await MongoStore.init()

await auth.initAuth()


// ---- Express app ----
const app = express();
app.use(cookieParser(config.COOKIE_SECRET));
app.use(express.json());
app.set("trust proxy", 1);
app.use(cors.makeCorsRouter())
app.use(auth.authRouter());

// Simple health
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// ---- Protect everything below this line ----
if(config.SKIP_AUTH){ 
  app.use(auth.requireAuthDevBypass)
  console.log("using auth bypass")
} else{ 
  app.use(auth.requireAuth) 
}

// e.g. /auth/ping → { value: "user@example.com" } (or any non-empty string)
app.get("/ping", (req, res) => {
  res.json({ value: String("ok") });
});

// Endpoint to get app configuration and environment info
app.get("/api/config", (req, res) => {
  res.json({ 
    isTestDb: config.IS_TEST_DB,
    dbName: config.DB_NAME,
    goals: config.appConfig.goals
  });
});

app.get("/", (req, res) => {
  res.redirect("/day.html");
});

// Add day routes
app.use("/day", makeDayRouter(mongo));

// Add food routes
app.use("/api/food", makeFoodRouter(mongo));

// Add meal routes
app.use("/api/meals", makeMealRouter(mongo));

// Add recipe routes
app.use("/api/recipes", makeRecipeRouter(mongo));

// Add progress routes
app.use("/api/progress", makeProgressRouter(mongo));

// Serve static UI
app.use(express.static(path.join(process.cwd(), "public")));

// app.get("/", (_req: Request, res: Response) => {
//   res.redirect(302, "/links.html");
// });

// Error handler (after routes)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", util.inspect(err, { depth: null, colors: false }));
  res.status(500).json({ error: "Internal Server Error" });
});
// ---- Single boot ----
//import type { Server } from "http";
let server: http.Server | https.Server;

async function main() {
  if(config.IS_LOCALHOST){
    const key = fs.readFileSync("certs/localhost-key.pem", "utf-8");
    const cert = fs.readFileSync("certs/localhost.pem", "utf-8");
    server =  https.createServer({ key, cert }, app) 
  } else {
    server =  http.createServer(app); 
  }
  server.listen(config.PORT, () => {
    console.log(`API+UI listening on ${config.APP_BASE_URL}`);
  });
}

main().catch((e) => {
  console.error("Startup failed:", e);
  process.exit(1);
});

// ---- Graceful shutdown ----
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  try {
    await mongo?.close();      // your global MongoClient
    server?.close(() => process.exit(0));
  } catch {
    process.exit(0);
  }
});