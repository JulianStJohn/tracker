
import express, { Request, Response, NextFunction } from "express";
import { MongoClient, Db, Collection, Document } from "mongodb";
import "dotenv/config";
import dotenv from 'dotenv';
import path from "node:path";
import crypto from "node:crypto";
import cookieParser from "cookie-parser";
import * as oc from "openid-client";
import { createRemoteJWKSet, jwtVerify, errors, type JWTPayload } from "jose";
import util from "node:util";
import * as yaml from 'js-yaml';
import * as fs from 'node:fs';



// ---- Config ----

export const COOKIE_SECRET = process.env['COOKIE_SECRET']
export const DB_NAME = process.env['DB_NAME']
export const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
export const MONGO_URI = process.env.MONGO_URI ? process.env.MONGO_URI : "" 

export const SKIP_AUTH = process.env.SKIP_AUTH === "1" || process.argv.includes("--no-auth");
if(SKIP_AUTH) console.log("SKIP_AUTH: No Auth")

// Never allow bypass in production
if (process.env.NODE_ENV === "production" && SKIP_AUTH) {
  console.error("Refusing to start with auth bypass in production.");
  process.exit(1);
}


// ---- Config (env) ----
export const {
  COGNITO_DOMAIN,
  COGNITO_ISSUER,
  COGNITO_CLIENT_ID,
  APP_BASE_URL,
} = process.env as Record<string, string>;

export const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET 

export const IS_LOCALHOST=APP_BASE_URL.includes("localhost")

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}


// IMPORTANT: Use the *User Pool Issuer* URL, e.g.
// https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_ABC123
export const ISSUER = new URL(mustEnv("COGNITO_ISSUER"));
export const CLIENT_ID: string = mustEnv("COGNITO_CLIENT_ID");

if (!COGNITO_DOMAIN || !COGNITO_CLIENT_ID) {
  console.error("Missing COGNITO_DOMAIN or COGNITO_CLIENT_ID env vars.");
  process.exit(1);
}

export const REDIRECT_URI = `${process.env.APP_BASE_URL}/callback`;
// Build URLs from domain
export const OIDC_ISSUER_URL = `https://${COGNITO_DOMAIN}`;
export const LOGOUT_REDIRECT_URI = `${APP_BASE_URL}/logged-out`;

// Load application configuration from config.yml
interface AppConfig {
  goals: {
    daily_kcal: number;
    tdee: number;
  };
}

let appConfig: AppConfig;

try {
  const configPath = path.join(process.cwd(), 'config.yml');
  const configFile = fs.readFileSync(configPath, 'utf8');
  appConfig = yaml.load(configFile) as AppConfig;
} catch (error) {
  console.warn('Failed to load config.yml, using defaults:', error);
  appConfig = {
    goals: {
      daily_kcal: 2000,
      tdee: 2400
    }
  };
}

export { appConfig };
