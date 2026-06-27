const { READ_ONLY_FUNCTIONS } = require("./registry");

const APPS_SCRIPT_WEB_APP_URL = process.env.APPS_SCRIPT_WEB_APP_URL;
const USE_APPS_SCRIPT_BACKEND =
  APPS_SCRIPT_WEB_APP_URL && process.env.FORCE_LOCAL_BACKEND !== "1";
const DEFAULT_READ_CACHE_TTL_MS = Number(
  process.env.APPS_SCRIPT_READ_CACHE_TTL_MS || 15000,
);
const readCache = new Map();

function getCacheKey(payload) {
  return JSON.stringify(payload || {});
}

function getCachedResponse(payload) {
  const fn = payload && payload.fn;
  if (!READ_ONLY_FUNCTIONS.has(fn) || DEFAULT_READ_CACHE_TTL_MS <= 0) {
    return null;
  }

  const cacheKey = getCacheKey(payload);
  const cached = readCache.get(cacheKey);
  if (!cached || cached.expiresAt <= Date.now()) {
    readCache.delete(cacheKey);
    return null;
  }

  return cached.text;
}

function setCachedResponse(payload, text) {
  const fn = payload && payload.fn;
  if (!READ_ONLY_FUNCTIONS.has(fn) || DEFAULT_READ_CACHE_TTL_MS <= 0) {
    return;
  }

  readCache.set(getCacheKey(payload), {
    text,
    expiresAt: Date.now() + DEFAULT_READ_CACHE_TTL_MS,
  });
}

function clearReadCacheForWrite(payload) {
  const fn = payload && payload.fn;
  if (!READ_ONLY_FUNCTIONS.has(fn)) {
    readCache.clear();
  }
}

async function proxyToAppsScript(payload, res) {
  try {
    const cached = getCachedResponse(payload);
    if (cached) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("X-AMIS-Cache", "HIT");
      res.end(cached);
      return;
    }

    const upstream = await fetch(APPS_SCRIPT_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    const text = await upstream.text();
    const trimmed = text.trim();
    if (trimmed.startsWith("<!DOCTYPE html") || trimmed.startsWith("<html")) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          message:
            "Apps Script backend is not accessible. Check the Web App deployment access and APPS_SCRIPT_WEB_APP_URL.",
        }),
      );
      return;
    }

    res.statusCode = upstream.ok ? 200 : upstream.status;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("X-AMIS-Cache", "MISS");
    if (upstream.ok) {
      setCachedResponse(payload, text);
      clearReadCacheForWrite(payload);
    }
    res.end(text);
  } catch (error) {
    console.error("Apps Script backend request failed", {
      fn: payload && payload.fn,
      message: error && error.message ? error.message : String(error),
      stack: error && error.stack ? error.stack : undefined,
    });
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: false,
        message: "Backend request failed. Please try again.",
      }),
    );
  }
}

module.exports = {
  APPS_SCRIPT_WEB_APP_URL,
  USE_APPS_SCRIPT_BACKEND,
  clearReadCacheForWrite,
  proxyToAppsScript,
};
