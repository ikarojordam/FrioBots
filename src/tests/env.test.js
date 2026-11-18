'use strict';
const { test }=require('node:test');const assert=require('node:assert/strict');
const { validateEnv }=require('../env');
const env={DISCORD_TOKEN:'fake',DISCORD_CLIENT_ID:'123456789012345678',SUPABASE_URL:'https://example.supabase.co',SUPABASE_KEY:'fake'};
test('required environment validated',()=>{
 assert.deepEqual(validateEnv(env),{hasOAuth:false});
 assert.throws(()=>validateEnv({}),/obrigatórias/);
 assert.throws(()=>validateEnv({...env,SUPABASE_URL:'http:\/\/example.com'}),/HTTPS/);
});
test('OAuth must declare client secret',()=>{
 assert.throws(()=>validateEnv({...env,REDIRECT_URI:'https://example.com/callback'}),/DISCORD_CLIENT_SECRET/);
 assert.equal(validateEnv({...env,DISCORD_CLIENT_SECRET:'fake'}).hasOAuth,true);
});
