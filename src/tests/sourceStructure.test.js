'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../..');const source=fs.readFileSync(path.join(root,'src/index.js'),'utf8');
test('legacy interface handlers migrated to named central router',()=>{
 assert.equal((source.match(/client\.on\('interactionCreate'/g)||[]).length,0);
 assert.match(source,/interactionRouter\.start\(\)/);
 assert.equal((source.match(/interactionRouter\.register\('/g)||[]).length,13);
});
test('OAuth panel uses durable server verification URL',()=>{
 assert.match(source,/const link = verificationEntryUrl\(guildId\)/);
 assert.match(source,/const oauthUrl = oauthVerifyUrl\(guildId\)/);
});
test('contains no Components V2 messages or incompatible import flags',()=>{
 assert.doesNotMatch(source,/MessageFlags\.IsComponentsV2/);
});

test('dev/admin have dedicated ACK routes and home navigation',()=>{
 assert.match(source,/register\('admin-dev-command'/);
 assert.match(source,/register\('admin-dev-navigation'/);
 assert.match(source,/frio_panel:dev:home/);
 assert.match(source,/frio_panel:admin:home/);
 assert.match(source,/await i\.deferReply\(\{ flags: EPHEMERAL \}\)/);
});

test('IA de ticket (frioai:*) tem dono único no roteador e não cria listener próprio',()=>{
 const gemini=fs.readFileSync(path.join(root,'src/ticket-gemini.js'),'utf8');
 assert.equal((gemini.match(/client\.on\('interactionCreate'/g)||[]).length,0);
 assert.match(gemini,/matchesInteraction, handleInteraction/);
 assert.match(source,/register\('ticket-ai'/);
 assert.match(source,/frio_ar_toggle:\|frioai:\)/);
});

test('hubs dev/admin: Voltar sem duplicar e limite de 5 linhas; REST com recuperação de emoji',()=>{
 assert.match(source,/installRestEmojiRecovery\(client\.rest/);
 assert.match(source,/rows\.length >= 5/);
 assert.match(source,/\['dev_back', 'adm_back', rootId\]/);
});
