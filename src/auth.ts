
import express, { Request, Response, NextFunction, Router } from "express";
import { MongoClient, Db, Collection, Document } from "mongodb";
import "dotenv/config";
import path from "node:path";
import crypto from "node:crypto";
import { randomUUID } from "node:crypto";
import cookieParser from "cookie-parser";
import * as oc from "openid-client";
import { createRemoteJWKSet, jwtVerify, errors, type JWTPayload } from "jose";
import util from "node:util";
import * as config from "./config.js"
import { MongoStore } from "./mongo.js"

import { errors as joseErrors } from "jose";

let openid_client_config: oc.Configuration;
let jwks: ReturnType<typeof createRemoteJWKSet>;


/* todo - add /extension-logout for extension 

After login, your site can redirect to a tiny page that calls window.close() when from=ext is present to auto-close the tab the extension opened.

Provide a /logout that clears the cookie; your extension can open it with chrome.tabs.create({ url: host + "/logout" }).

also, need to configure cognito to accept the extension login?

*/

function logErr(ctx: string, e: unknown) {
  // ALWAYS see message/stack and any useful fields
  console.error(ctx, e);
  if (e instanceof Error) {
    console.error(ctx, e.name, e.message);
    console.error(e.stack);
  } else {
    console.error(ctx, require("util").inspect(e, { depth: 5 }));
  }
}


export async function initAuth(): Promise<void> {
  try {
    openid_client_config = await oc.discovery(config.ISSUER, config.CLIENT_ID, config.CLIENT_SECRET);
    const meta = openid_client_config.serverMetadata();
    console.log("scopes_supported:", meta.scopes_supported);

    if (!meta.jwks_uri) throw new Error("OIDC metadata lacks jwks_uri");
    jwks = createRemoteJWKSet(new URL(meta.jwks_uri));
    console.log("OIDC ready:", meta.issuer);
  } catch (e: any) {
    // openid-client v6 may throw non-Error objects; print something useful
    console.error("initAuth discovery failed.");
    console.error("Type:", typeof e, "keys:", e && Object.keys(e));
    console.error("Message:", e?.message ?? e);
    // Sometimes you get a Response-like object:
    if (e?.response && typeof e.response.text === "function") {
      try {
        const body = await e.response.text();
        console.error("HTTP status:", e.response.status, "body:", body);
      } catch {}
    }
    throw e; // rethrow so main() stops
  }
}

export async function requireAuthDevBypass (req: Request, _res: Response, next: NextFunction): Promise<void> {
  // attach a fake user; customize as you like
  (req as any).user = { email: "dev@example.com", token_use: "id" };
  next();
};


async function refreshWithCognito(refreshToken: string) {
  console.log(`refreshWithCognito:(${refreshToken.substring(0,20)}...)`)
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: process.env.COGNITO_CLIENT_ID!,
    refresh_token: refreshToken,
  });
  const headers: Record<string,string> = { "Content-Type":"application/x-www-form-urlencoded" };
  if (process.env.COGNITO_CLIENT_SECRET) {
    const basic = Buffer.from(`${process.env.COGNITO_CLIENT_ID}:${process.env.COGNITO_CLIENT_SECRET}`).toString("base64");
    headers.Authorization = `Basic ${basic}`;
  }
  const resp = await fetch(`https://${process.env.COGNITO_DOMAIN}/oauth2/token`, { method:"POST", headers, body });
  
  
  const txt = await resp.text();
  if (!resp.ok) throw new Error(`refresh ${resp.status} ${resp.statusText}: ${txt}`);
  return JSON.parse(txt) as { id_token: string; access_token: string; expires_in: number; token_type: string; refresh_token?: string };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const id = (req as any).signedCookies?.id_token as string | undefined;
    const refresh = (req as any).signedCookies?.refresh_token as string | undefined;

    if (id) {
      try {
        await jwtVerify(id, jwks, {
          issuer: openid_client_config.serverMetadata().issuer,
          audience: config.CLIENT_ID,
        });
        return next();
      } catch (e) {
        // Only fall back to refresh on *expiry*
        if (!(e instanceof joseErrors.JWTExpired)) {
          logErr("jwtVerify failed (not expired)", e);
          throw e;
        }
        // else continue to refresh path below
      }
    }

    if (!refresh) {
      console.log("requireAuth: no refresh → /login");
      return res.redirect("/login");
    }

    try {
      const t = await refreshWithCognito(refresh);
      res.cookie("id_token", t.id_token,   { httpOnly:true, secure:true, signed:true, sameSite:"none", path:"/", maxAge: t.expires_in*1000 });
      res.cookie("access_token", t.access_token, { httpOnly:true, secure:true, signed:true, sameSite:"lax",  path:"/", maxAge: t.expires_in*1000 });
      return next();
    } catch (e) {
      logErr("refreshWithCognito failed", e);
      ['id_token','access_token','refresh_token'].forEach(name =>
        res.clearCookie(name, { httpOnly:true, sameSite:'lax', secure:isHttps, signed:true })
      );
      return res.redirect("/login");
    }
  } catch (e) {
    logErr("requireAuth catch", e);
    ['id_token','access_token','refresh_token'].forEach(name =>
      res.clearCookie(name, { httpOnly:true, sameSite:'lax', secure:isHttps, signed:true })
    );
    return res.redirect("/login");
  }
}


// --- Auth helpers ---
const isHttps = config.APP_BASE_URL.startsWith("https://");

type Channel = 'web' | 'ext';
const chFromState = (s: string): Channel => s.startsWith('ext:') ? 'ext' : 'web';
const CK = (base: 'state'|'pkce', ch: Channel) => `${base}_${ch}`;

const cookieOpts = { httpOnly: true, sameSite: 'lax' as const, secure: isHttps, path: "/", signed: true };

function setTmpCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, { ...cookieOpts, maxAge: 10 * 60 * 1000 });
}

function clearTmpCookies(res: Response, ch: Channel) {
  res.clearCookie(CK('state', ch), cookieOpts);
  res.clearCookie(CK('pkce',  ch), cookieOpts);
}

// function clearTmpCookies(res: Response) {
//   ["oidc_state", "oidc_nonce", "oidc_verifier"].forEach((n) =>
//     res.clearCookie(n, { httpOnly: true, sameSite: "lax", secure: isHttps, signed: true })
//   );
// }


// ---- Auth routes ----
export function authRouter(): Router {
  const r = Router();
  // login
  // /login?from=ext  OR /login (defaults to web)
  r.get('/login', async (req, res) => {
    const ch: Channel = req.query.from === 'ext' ? 'ext' : 'web';

    const verifier = oc.randomPKCECodeVerifier();
    const challenge = await oc.calculatePKCECodeChallenge(verifier);
    const state = `${ch}:${oc.randomState()}`;

    setTmpCookie(res, CK('pkce', ch), verifier);
    setTmpCookie(res, CK('state', ch), state);

    const url = oc.buildAuthorizationUrl(openid_client_config, {
      redirect_uri: config.REDIRECT_URI,
      scope: 'openid email',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
    });
    console.log('[login] redirect_uri =', config.REDIRECT_URI);

    res.redirect(url.href);
  });

/*
  r.get('/callback', async (req, res, next) => {
    console.log('[cb] signedCookies:', Object.keys(req.signedCookies || {}));
    console.log('[cb] cookies     :', Object.keys(req.cookies || {}));
    try {
      const currentUrl = new URL(`${req.protocol}://${req.get('host')}${req.originalUrl}`);
      const currentRedirect = `${currentUrl.origin}${currentUrl.pathname}`;
      console.log('[cb] current redirect_uri =', currentRedirect);
      const stateParam = currentUrl.searchParams.get('state') || '';
      if (!stateParam) throw new Error('missing state');
      const ch = chFromState(stateParam);
  
      const expectedState = req.signedCookies?.[CK('state', ch)];
      const pkce = req.signedCookies?.[CK('pkce', ch)];
      if (!expectedState || !pkce) throw new Error('missing verifier/state cookie');
  
      const tokens = await oc.authorizationCodeGrant(openid_client_config, currentUrl, {
        expectedState,
        pkceCodeVerifier: pkce,
      });
  
      clearTmpCookies(res, ch);
      // id token for 24 hour access
      res.cookie('id_token', tokens.id_token!, {
        httpOnly: true,
        sameSite: 'none', // for extension cross-site requests
        secure: true,
        signed: true,
        path: '/',
        maxAge: (tokens.expires_in ?? 3600) * 1000,
      });
      // access token for longer access
        res.cookie("access_token", tokens.access_token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        signed: true,
        maxAge: (tokens.expires_in ?? 3600) * 1000,

      })
      if (tokens.refresh_token) {
        res.cookie('refresh_token', tokens.refresh_token, {
          httpOnly: true, secure: true, signed: true, sameSite: 'none', path: '/',
          maxAge: 30 * 24 * 60 * 60 * 1000,        // match your Cognito refresh TTL
        });
      }
  
      res.redirect(ch === 'ext' ? '/login-done-ext' : '/');
    } catch (e) {
	console.error('callback failure:', {
	    code: e?.code,
	    status: e?.status,
	    error: e?.error,
	    desc: e?.error_description,
	    cause: e?.cause
	  });
	  return next(e);

    }
  });

 */


// Optional: tiny helper to print short strings safely
const short = (s?: string, n = 16) => (s ? `${s.slice(0, n)}…(${s.length})` : '∅');

r.get('/callback', async (req, res, next) => {
  const rid = randomUUID();         // request correlation id
  const t0  = process.hrtime.bigint();

  try {
    // ---- Proxy / request context ----
    console.log(`[cb ${rid}] incoming`, {
      method: req.method,
      url: req.originalUrl,
      host: req.get('host'),
      proto: req.protocol,
      secure: req.secure,
      xf_proto: req.get('x-forwarded-proto'),
      xf_host: req.get('x-forwarded-host'),
      xff: req.get('x-forwarded-for'),
      cfip: req.get('cf-connecting-ip'),
      trustProxy: req.app.get('trust proxy'),
    });

    console.log(`[cb ${rid}] cookies.signed`, Object.keys(req.signedCookies || {}));
    console.log(`[cb ${rid}] cookies.plain `, Object.keys(req.cookies || {}));

    // ---- Redirect URI consistency ----
    const currentUrl = new URL(`${req.protocol}://${req.get('host')}${req.originalUrl}`);
    const currentRedirect = `${currentUrl.origin}${currentUrl.pathname}`;
    console.log(`[cb ${rid}] redirect_uri`, {
      expected: config.REDIRECT_URI,
      got: currentRedirect,
      match: currentRedirect === config.REDIRECT_URI
    });

    // ---- State/PKCE ----
    const stateParam = currentUrl.searchParams.get('state') || '';
    if (!stateParam) throw new Error('missing state');
    const ch = chFromState(stateParam);

    const stateCookieName = CK('state', ch);
    const pkceCookieName  = CK('pkce', ch);
    const expectedState   = req.signedCookies?.[stateCookieName];
    const pkce            = req.signedCookies?.[pkceCookieName];

    console.log(`[cb ${rid}] state`, {
      stateParam: short(stateParam),
      stateCookieName,
      haveExpectedState: !!expectedState,
      matches: expectedState === stateParam
    });
    console.log(`[cb ${rid}] pkce`, {
      pkceCookieName,
      havePkce: !!pkce,
      pkceLen: pkce?.length ?? 0
    });

    if (!expectedState || !pkce) {
      throw new Error('missing verifier/state cookie');
    }

    // ---- OIDC metadata sanity ----
    const meta = openid_client_config.serverMetadata();
    console.log(`[cb ${rid}] oidc`, {
      issuer: meta.issuer,
      token_endpoint: meta.token_endpoint,
      authorization_endpoint: meta.authorization_endpoint
    });

    // ---- Exchange code → tokens ----
    console.log(`[cb ${rid}] exchanging code…`);
    const tokens = await oc.authorizationCodeGrant(openid_client_config, currentUrl, {
      expectedState,
      pkceCodeVerifier: pkce,
    });
    console.log(`[cb ${rid}] tokens`, {
      id_token_len: tokens.id_token?.length ?? 0,
      access_token_len: tokens.access_token?.length ?? 0,
      refresh_token_len: tokens.refresh_token?.length ?? 0,
      expires_in: tokens.expires_in
    });

    // ---- Clear transient cookies ----
    clearTmpCookies(res, ch);

    // ---- Set app cookies (measure header size) ----
    const base = { httpOnly: true, secure: true, signed: true, path: '/' as const };
    res.cookie('id_token', tokens.id_token!, { ...base, sameSite: 'none', maxAge: (tokens.expires_in ?? 3600) * 1000 });
    res.cookie('access_token', tokens.access_token, { ...base, sameSite: 'lax',  maxAge: (tokens.expires_in ?? 3600) * 1000 });
    if (tokens.refresh_token) {
      res.cookie('refresh_token', tokens.refresh_token, { ...base, sameSite: 'none', maxAge: 30 * 24 * 60 * 60 * 1000 });
    }

    // Inspect what we’re about to send back (useful for “upstream sent too big header”)
    const setCookieHdr = res.getHeader('Set-Cookie');
    const serialized = Array.isArray(setCookieHdr) ? setCookieHdr.join('\n') : String(setCookieHdr ?? '');
    console.log(`[cb ${rid}] set-cookie count/bytes`, {
      count: Array.isArray(setCookieHdr) ? setCookieHdr.length : (setCookieHdr ? 1 : 0),
      bytes: Buffer.byteLength(serialized)
    });

    // ---- Redirect user out of /callback ----
    const dest = ch === 'ext' ? '/login-done-ext' : '/';
    console.log(`[cb ${rid}] redirecting → ${dest}`);

    const t1 = process.hrtime.bigint();
    console.log(`[cb ${rid}] done in ${Number(t1 - t0) / 1e6} ms`);
    return res.redirect(dest);

  } catch (e: any) {
    // openid-client/oauth4webapi shape useful fields like { code, status, error, error_description, cause }
    console.error(`[cb ${rid}] failure`, {
      name: e?.name,
      message: e?.message,
      code: e?.code,
      status: e?.status,
      error: e?.error,
      error_description: e?.error_description,
      cause: e?.cause
    });
    return next(e);
  }
});


  // Logout locally and at Cognito
  r.get("/logout", (req, res) => {
    // 1) Clear your app cookie
    res.clearCookie("id_token", { httpOnly: true, sameSite: "lax", secure: isHttps, signed: true });

    // 2) Build Cognito logout URL from metadata if available, else fallback
    const meta = openid_client_config.serverMetadata() as any;
    const endSessionUrl = meta.end_session_endpoint
      ? new URL(meta.end_session_endpoint)
      : new URL("/logout", `https://${process.env.COGNITO_DOMAIN}`);

    endSessionUrl.search = new URLSearchParams({
      client_id: config.CLIENT_ID,                  // use the validated constant you set earlier
      logout_uri: config.LOGOUT_REDIRECT_URI,       // must be in App client's Sign-out URLs
    }).toString();

    // Optional: log to confirm
    // console.log("Redirecting to Cognito logout:", endSessionUrl.toString());

    res.redirect(endSessionUrl.toString());
  });

  // Simple post-logout page
  r.get("/logged-out", (_req, res) => {
    res.send('<p>Signed out. <a href="/login">Sign in</a></p>');
  });

  r.get("/login-done-ext", (_req, res) => {

    res.redirect('/open_extension.html'); 
  }); 
  // (Optional) whoami for debugging
  r.get("/me", requireAuth, (req, res) => {
    res.json((req as any).user);
  });

  return r;
}
