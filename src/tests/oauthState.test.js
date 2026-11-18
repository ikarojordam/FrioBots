'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createOAuthState, parseOAuthState, createReplayGuard } = require('../oauthState');
const secret='test-secret'; const guildId='123456789012345678';
test('OAuth state valid signature and server identification',()=>{
  const s=createOAuthState(secret,guildId,Date.now());
  const parsed=parseOAuthState(secret,s);
  assert.equal(parsed.guildId,guildId);assert.equal(parsed.nonce.length,32);
});
test('OAuth rejects tampering and missing signatures',()=>{
  const s=createOAuthState(secret,guildId);
  assert.equal(parseOAuthState(secret,s.replace(guildId,'123456789012345679')),null);
  assert.equal(parseOAuthState('different-secret',s),null);
  assert.equal(parseOAuthState(secret,'verify:'+guildId),null);
});
test('OAuth state expires and rejects future timestamps',()=>{
  const t=Date.now();
  const old=createOAuthState(secret,guildId,t-11*60_000);
  assert.equal(parseOAuthState(secret,old,t),null);
  const future=createOAuthState(secret,guildId,t+2*60_000);
  assert.equal(parseOAuthState(secret,future,t),null);
});
test('OAuth state is single-use',()=>{
  const guard=createReplayGuard(); const info=parseOAuthState(secret,createOAuthState(secret,guildId));
  assert.equal(guard(info),true); assert.equal(guard(info),false);
});
test('OAuth invalid guild id fails closed',()=>{
  assert.throws(()=>createOAuthState(secret,'evil'),/invalid/);
});
