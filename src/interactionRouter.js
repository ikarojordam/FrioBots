'use strict';
const { log, sanitize } = require('./logger');
const { installEmojiRecovery } = require('./emojiRecovery');

/** Dispatches ONE interaction to ONE owner. No blanket ACK: modals must use showModal() first. */
function createInteractionRouter(client, options = {}) {
  const routes = new Map();
  let started = false;
  const timeoutMs = options.warningMs || 2200;
  const ephemeral = options.ephemeral ?? 64;
  const stats = new Map();

  function register(name, match, run, { fallback = false } = {}) {
    if (!name || typeof match !== 'function' || typeof run !== 'function') throw Error('Invalid route registration');
    if (routes.has(name)) throw Error(`Route name already registered: ${name}`);
    if (started) throw Error(`Cannot register route ${name} after router.start()`);
    routes.set(name, { match, run, fallback });
  }

  async function dispatch(interaction) {
    if (!interaction?.isRepliable?.()) return;
    installEmojiRecovery(interaction, method => log('warn', 'invalid_custom_emoji_recovered', { method, id: String(interaction.customId || interaction.commandName || 'unknown'), guild: interaction.guildId || 'DM' }));
    if (options.beforeDispatch) await options.beforeDispatch(interaction);
    const startedAt = Date.now();
    const id = String(interaction.customId || (interaction.isChatInputCommand?.() ? `/${interaction.commandName}` : `type:${interaction.type}`));
    const ctx = { id: sanitize(id), guild: interaction.guildId || 'DM', user: interaction.user?.id || 'unknown' };
    const watchdog = setTimeout(() => {
      if (!interaction.deferred && !interaction.replied) log('warn', 'interaction_no_ack', { ...ctx, elapsedMs: Date.now() - startedAt });
    }, timeoutMs);
    watchdog.unref?.();
    let owner = 'unrouted';
    try {
      const found = [];
      for (const [name, route] of routes) {
        if (route.match(interaction)) found.push({ name, ...route });
      }
      const specific = found.filter(r => !r.fallback);
      if (specific.length > 1) throw Error(`Ambiguous interaction route: ${specific.map(r => r.name).join(', ')}`);
      const chosen = specific[0] || found.find(r => r.fallback);
      if (chosen) {
        owner = chosen.name;
        await chosen.run(interaction);
      }
      if (!interaction.deferred && !interaction.replied) {
        log('warn', 'interaction_unanswered', { ...ctx, owner, elapsedMs: Date.now() - startedAt });
        // An unknown or incomplete route is replied to with a useful error, not left hanging.
        await interaction.reply({ content: 'Este menu não está disponível ou está desatualizado. Reabra o painel e tente novamente.', flags: ephemeral });
      }
    } catch (err) {
      log('error', 'interaction_exception', { ...ctx, owner, elapsedMs: Date.now() - startedAt, error: err?.message || err });
      const payload = { content: 'Não foi possível concluir essa ação. Tente novamente ou avise a equipe.', flags: ephemeral };
      try {
        if (interaction.deferred && !interaction.replied) await interaction.editReply({ content: payload.content });
        else if (!interaction.replied) await interaction.reply(payload);
        else await interaction.followUp(payload);
      } catch (sendError) { log('warn', 'interaction_error_reply_failed', { ...ctx, code: sendError?.code || 'unknown' }); }
    } finally {
      clearTimeout(watchdog);
      const elapsedMs = Date.now() - startedAt;
      const current = stats.get(owner) || { n: 0, totalMs: 0, maxMs: 0, unacked: 0 };
      current.n += 1; current.totalMs += elapsedMs; current.maxMs = Math.max(current.maxMs, elapsedMs);
      if (!interaction.deferred && !interaction.replied) current.unacked += 1;
      stats.set(owner, current);
      if (elapsedMs > timeoutMs) log('warn', 'interaction_slow', { ...ctx, owner, elapsedMs });
      else if (process.env.INTERACTION_VERBOSE_LOGS === 'true') log('info', 'interaction_completed', { ...ctx, owner, elapsedMs });
    }
  }
  function start() {
    if (started) throw Error('Router already started');
    started = true;
    client.on('interactionCreate', dispatch);
  }
  function metrics() { return Object.fromEntries(stats); }
  return { register, start, dispatch, metrics, get routeNames() { return [...routes.keys()]; } };
}
module.exports = { createInteractionRouter };
