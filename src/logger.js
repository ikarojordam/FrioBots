'use strict';
const SECRET = /(Bot\s+[A-Za-z0-9._-]{15,}|Bearer\s+[A-Za-z0-9._-]{15,}|(access_token|refresh_token|client_secret|service_role|discord_token|jwt_secret|verify_secret)[=:]\s*[^\s,}]+)/gi;
function sanitize(text) { return String(text ?? '').replace(SECRET, '[REDACTED]').slice(0, 900); }
function log(level, event, context = {}) {
  const values = {};
  for (const [key, value] of Object.entries(context)) {
    if (/token|secret|password|authorization|cookie/i.test(key)) continue;
    values[key] = typeof value === 'string' ? sanitize(value) : (typeof value === 'number' || typeof value === 'boolean' ? value : undefined);
  }
  const line = JSON.stringify({ at: new Date().toISOString(), level, event, ...values });
  if (level === 'error') console.error(line); else if (level === 'warn') console.warn(line); else console.log(line);
}
module.exports = { log, sanitize };
