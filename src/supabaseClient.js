'use strict';
const { createClient } = require('@supabase/supabase-js');
function initSupabase() {
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
  auth: { persistSession: false },
  global: {
    headers: { 'X-Client-Info': 'frio-bot' },
    fetch: (url, opts = {}) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timeout));
    },
  },
  db: { schema: 'public' },
});

// O builder de queries do supabase-js é "thenable" mas NÃO tem .catch(); o código tem vários
// `supabase.from(...)....catch(() => {})` que davam "catch is not a function" e derrubavam o handler.
// Este patch adiciona .catch() ao protótipo do builder (idempotente e inofensivo se já existir).
function patchPostgrestCatch(client) {
  try {
    let o = client.from('_probe_').select();
    while (o && !Object.prototype.hasOwnProperty.call(o, 'then')) o = Object.getPrototypeOf(o);
    if (o && typeof o.catch !== 'function') {
      Object.defineProperty(o, 'catch', {
        value: function (onRejected) { return this.then(undefined, onRejected); },
        configurable: true, writable: true,
      });
    }
  } catch (e) { console.warn('[supabase] patch .catch não aplicado:', e.message); }
}
patchPostgrestCatch(supabase);
return supabase;
}
module.exports = { initSupabase };
