'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createInteractionRouter } = require('../interactionRouter');
function fake(kind = 'button', id = 'hub', obj = {}) {
  const calls = [];
  return {
    customId: id, commandName: id, guildId: '123456789012345678', user: { id: '234567890123456789' }, calls,
    deferred: false, replied: false,
    isRepliable: () => true, isButton: () => kind === 'button', isStringSelectMenu: () => kind === 'select',
    isChatInputCommand: () => kind === 'command', isModalSubmit: () => kind === 'modal',
    async reply(payload) { if (this.replied || this.deferred) throw Error('duplicate reply'); this.replied = true; calls.push(['reply',payload]); },
    async deferReply() { if (this.replied || this.deferred) throw Error('duplicate ack'); this.deferred = true; calls.push(['deferReply']); },
    async showModal() { if (this.replied || this.deferred) throw Error('modal after ACK'); this.replied = true; calls.push(['showModal']); },
    async editReply(x) { calls.push(['editReply',x]); this.replied = true; },
    async followUp(x) { calls.push(['followUp',x]); }, ...obj,
  };
}
test('one event listener and one owner, even when fallback matches', async () => {
  const client = new EventEmitter(); const router = createInteractionRouter(client);
  router.register('specific', i => i.customId === 'hub', async i => i.reply({ content:'ok' }));
  router.register('generic', i => true, async i => i.reply({content:'wrong'}), {fallback:true});
  router.start();
  assert.equal(client.listenerCount('interactionCreate'),1);
  const interaction = fake(); await router.dispatch(interaction);
  assert.deepEqual(interaction.calls.map(x=>x[0]), ['reply']);
  assert.equal(interaction.calls[0][1].content,'ok');
  assert.equal(router.metrics().specific.n,1);
});
test('duplicate route names detected at registration',()=>{
  const r=createInteractionRouter(new EventEmitter());
  r.register('same',()=>true,()=>{});
  assert.throws(()=>r.register('same',()=>true,()=>{}),/already registered/);
});
test('ambiguous owners reply with safe error, never executing either',async()=>{
  let count=0; const r=createInteractionRouter(new EventEmitter());
  r.register('a',()=>true,()=>{count++;});r.register('b',()=>true,()=>{count++;});
  const i=fake(); await r.dispatch(i);
  assert.equal(count,0);assert.equal(i.calls.length,1);assert.equal(i.replied,true);
});
test('modal must be first ACK',async()=>{
  const r=createInteractionRouter(new EventEmitter());
  r.register('modal',()=>true, async i => i.showModal({title:'Test'}));
  const i=fake('button'); await r.dispatch(i);
  assert.deepEqual(i.calls.map(x=>x[0]), ['showModal']);
});
test('deferred interaction is not followed by fallback reply',async()=>{
  const r=createInteractionRouter(new EventEmitter());
  r.register('slow',()=>true, async i=>{await i.deferReply();await i.editReply('ok');});
  const i=fake();await r.dispatch(i);assert.deepEqual(i.calls.map(x=>x[0]), ['deferReply','editReply']);
});
test('unhandled ID gets human-readable reply',async()=>{
  const r=createInteractionRouter(new EventEmitter());
  r.register('nobody',()=>false,()=>{});
  const i=fake('button','removed:old');await r.dispatch(i);
  assert.match(i.calls[0][1].content,/não está disponível/);
});
test('handler exceptions get safe response',async()=>{
  const r=createInteractionRouter(new EventEmitter());
  r.register('bad',()=>true, async()=>{throw Error('do not print secret');});
  const i=fake();await r.dispatch(i);
  assert.match(i.calls[0][1].content,/Não foi possível/);
});
test('remap occurs before matching',async()=>{
  const r=createInteractionRouter(new EventEmitter(),{beforeDispatch:i=>{i.commandName='legacy'}});
  r.register('legacy',i=>i.commandName==='legacy',async i=>i.reply({content:'mapped'}));
  const i=fake('command','new'); await r.dispatch(i); assert.equal(i.calls[0][1].content,'mapped');
});
