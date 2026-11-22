'use strict';

// Recupera apenas respostas recusadas pela API por emoji personalizado inválido.
// Não substitui emojis por Unicode nem modifica o payload original dos painéis.
function invalidEmojiError(error) {
  return /COMPONENT_INVALID_EMOJI|Invalid emoji/i.test(String(error?.rawError?.message || error?.message || '')) ||
    (error?.rawError?.errors && JSON.stringify(error.rawError.errors).includes('COMPONENT_INVALID_EMOJI'));
}

function cleanComponents(components) {
  if (!Array.isArray(components)) return components;
  return components.map(component => {
    const item = typeof component?.toJSON === 'function' ? component.toJSON() : component;
    if (!item || typeof item !== 'object') return item;
    const copy = { ...item };
    if (copy.emoji && typeof copy.emoji === 'object' && copy.emoji.id) delete copy.emoji;
    if (Array.isArray(copy.components)) copy.components = cleanComponents(copy.components);
    if (Array.isArray(copy.options)) copy.options = copy.options.map(opt => {
      const option = typeof opt?.toJSON === 'function' ? opt.toJSON() : opt;
      if (!option || typeof option !== 'object') return option;
      const out = { ...option };
      if (out.emoji && typeof out.emoji === 'object' && out.emoji.id) delete out.emoji;
      return out;
    });
    return copy;
  });
}

function withoutInvalidComponentEmojis(payload) {
  if (!payload || !Array.isArray(payload.components)) return payload;
  return { ...payload, components: cleanComponents(payload.components) };
}

function installEmojiRecovery(interaction, log = () => {}) {
  if (!interaction || interaction.__frioEmojiRecoveryInstalled) return;
  Object.defineProperty(interaction, '__frioEmojiRecoveryInstalled', { value: true });
  for (const method of ['reply', 'update', 'editReply', 'followUp']) {
    if (typeof interaction[method] !== 'function') continue;
    const original = interaction[method].bind(interaction);
    interaction[method] = async function(payload, ...args) {
      try {
        return await original(payload, ...args);
      } catch (error) {
        if (!invalidEmojiError(error) || !payload?.components?.length) throw error;
        const recovered = withoutInvalidComponentEmojis(payload);
        log(method);
        return await original(recovered, ...args);
      }
    };
  }
}

// Recuperação no nível do REST: cobre channel.send, message.edit, webhooks e respostas de interação
// (corpo em body.components ou body.data.components). Tenta de novo UMA vez sem os emojis customizados.
function bodyWithoutInvalidEmojis(body) {
  if (!body || typeof body !== 'object') return null;
  if (Array.isArray(body.components) && body.components.length) return { ...body, components: cleanComponents(body.components) };
  if (body.data && Array.isArray(body.data.components) && body.data.components.length) {
    return { ...body, data: { ...body.data, components: cleanComponents(body.data.components) } };
  }
  return null;
}

function installRestEmojiRecovery(rest, log = () => {}) {
  if (!rest || typeof rest.request !== 'function' || rest.__frioRestEmojiRecoveryInstalled) return false;
  Object.defineProperty(rest, '__frioRestEmojiRecoveryInstalled', { value: true });
  const original = rest.request.bind(rest);
  rest.request = async function(options, ...args) {
    try {
      return await original(options, ...args);
    } catch (error) {
      if (!invalidEmojiError(error)) throw error;
      const body = bodyWithoutInvalidEmojis(options?.body);
      if (!body) throw error;
      log(String(options?.method || 'REQUEST'));
      return await original({ ...options, body }, ...args);
    }
  };
  return true;
}

module.exports = { invalidEmojiError, cleanComponents, withoutInvalidComponentEmojis, installEmojiRecovery, bodyWithoutInvalidEmojis, installRestEmojiRecovery };
