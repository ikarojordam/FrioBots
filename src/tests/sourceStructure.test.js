'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../..');const source=fs.readFileSync(path.join(root,'src/index.js'),'utf8');
test('legacy interface handlers migrated to named central router',()=>{
 assert.equal((source.match(/client\.on\('interactionCreate'/g)||[]).length,0);
 assert.match(source,/interactionRouter\.start\(\)/);
 assert.equal((source.match(/interactionRouter\.register\('/g)||[]).length,10);
});
test('OAuth panel uses durable server verification URL',()=>{
 assert.match(source,/const link = verificationEntryUrl\(guildId\)/);
 assert.match(source,/const oauthUrl = oauthVerifyUrl\(guildId\)/);
});
test('contains no Components V2 messages or incompatible import flags',()=>{
 assert.doesNotMatch(source,/MessageFlags\.IsComponentsV2/);
});
