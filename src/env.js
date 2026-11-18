'use strict';
function validateEnv(env = process.env) {
  const required = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'SUPABASE_URL', 'SUPABASE_KEY'];
  const missing = required.filter(k => !env[k]);
  if (missing.length) throw Error(`Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}`);
  let url;
  try { url = new URL(env.SUPABASE_URL); } catch { throw Error('SUPABASE_URL inválida'); }
  if (url.protocol !== 'https:') throw Error('SUPABASE_URL deve ser HTTPS');
  const hasOAuth = !!(env.DISCORD_CLIENT_SECRET || env.REDIRECT_URI || env.PUBLIC_BASE_URL);
  if (hasOAuth && !env.DISCORD_CLIENT_SECRET) throw Error('OAuth2 requer DISCORD_CLIENT_SECRET');
  return { hasOAuth };
}
module.exports = { validateEnv };
