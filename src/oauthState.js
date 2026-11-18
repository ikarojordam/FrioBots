'use strict';
const crypto = require('node:crypto');
const SNOWFLAKE = /^\d{17,20}$/;
function createOAuthState(secret, guildId, now = Date.now()) {
  if (!secret || !SNOWFLAKE.test(String(guildId))) throw Error('OAuth state parameters invalid');
  const nonce = crypto.randomBytes(16).toString('hex');
  const body = `${guildId}.${now}.${nonce}`;
  const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return `${body}.${sig}`;
}
function parseOAuthState(secret, state, now = Date.now(), ttlMs = 10 * 60_000) {
  const parts = String(state || '').split('.');
  if (!secret || parts.length !== 4) return null;
  const [guildId, timestamp, nonce, sig] = parts;
  if (!SNOWFLAKE.test(guildId) || !/^\d{13}$/.test(timestamp) || !/^[0-9a-f]{32}$/.test(nonce) || !/^[0-9a-f]{64}$/.test(sig)) return null;
  if (Number(timestamp) > now + 30000 || now - Number(timestamp) > ttlMs) return null;
  const expected = crypto.createHmac('sha256', secret).update(`${guildId}.${timestamp}.${nonce}`).digest();
  const actual = Buffer.from(sig, 'hex');
  if (actual.length !== expected.length || !crypto.timingSafeEqual(expected, actual)) return null;
  return { guildId, nonce, timestamp: Number(timestamp) };
}
// Single-use state replay prevention, bounded even under abandoned authorization requests.
function createReplayGuard({ ttlMs = 10 * 60_000, max = 10000 } = {}) {
  const used = new Map();
  return (stateInfo, now = Date.now()) => {
    if (!stateInfo || used.has(stateInfo.nonce)) return false;
    if (used.size >= max) for (const [key, exp] of used) { if (exp <= now || used.size >= max) used.delete(key); }
    used.set(stateInfo.nonce, now + ttlMs);
    return true;
  };
}
module.exports = { createOAuthState, parseOAuthState, createReplayGuard };
