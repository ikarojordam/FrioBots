'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { installEmojiRecovery, withoutInvalidComponentEmojis } = require('../emojiRecovery');
const payload = { embeds: [{title:'FrioBot'}], components: [{type:1,components:[{type:2,custom_id:'dev:back',label:'Voltar',style:2,emoji:{id:'1425679402070704208',name:'left'}}]},{type:1,components:[{type:3,custom_id:'adm_cat_pick',options:[{label:'Servidor',value:'server',emoji:{id:'1532467012901801996',name:'config'}}]}]}] };
test('remove apenas custom emojis de componentes e opções, sem alterar IDs', () => {
 const out = withoutInvalidComponentEmojis(payload);
 assert.equal(out.components[0].components[0].emoji, undefined);
 assert.equal(out.components[0].components[0].custom_id,'dev:back');
 assert.equal(out.components[1].components[0].options[0].emoji,undefined);
 assert.deepEqual(out.embeds,payload.embeds);
 assert.ok(payload.components[0].components[0].emoji);
});
test('tenta novamente uma vez após rejeição de emoji', async () => {
 const sent=[];
 const interaction={reply:async p=>{sent.push(p);if(sent.length===1)throw new Error('COMPONENT_INVALID_EMOJI: Invalid emoji');return {ok:true};}};
 installEmojiRecovery(interaction);
 await interaction.reply(payload);
 assert.equal(sent.length,2);
 assert.equal(sent[1].components[0].components[0].emoji,undefined);
});
test('não repete erros de permissão ou outros erros', async () => {
 let n=0; const interaction={update:async()=>{n++;throw new Error('Missing Permissions');}};
 installEmojiRecovery(interaction);
 await assert.rejects(()=>interaction.update(payload),/Missing Permissions/);
 assert.equal(n,1);
});
const { installRestEmojiRecovery, bodyWithoutInvalidEmojis } = require('../emojiRecovery');
test('REST: channel.send/edit com emoji inválido é reenviado uma vez sem emojis customizados', async () => {
 const calls=[]; const rest={request:async o=>{calls.push(o);if(calls.length===1){const e=new Error('Invalid Form Body');e.rawError={message:'Invalid Form Body',errors:{components:{0:{components:{0:{emoji:{_errors:[{code:'COMPONENT_INVALID_EMOJI'}]}}}}}}};throw e;}return {ok:true};}};
 assert.equal(installRestEmojiRecovery(rest),true);
 assert.deepEqual(await rest.request({method:'POST',fullRoute:'/channels/1/messages',body:payload}),{ok:true});
 assert.equal(calls.length,2);
 assert.equal(calls[1].body.components[0].components[0].emoji,undefined);
 assert.ok(payload.components[0].components[0].emoji);
});
test('REST: corpo de resposta de interação (body.data.components) também é recuperado', () => {
 const out=bodyWithoutInvalidEmojis({type:7,data:{components:payload.components,content:'x'}});
 assert.equal(out.data.components[0].components[0].emoji,undefined);
 assert.equal(out.data.content,'x');
});
test('REST: outros erros e corpos sem componentes não são repetidos', async () => {
 let n=0; const rest={request:async()=>{n++;throw new Error('Missing Permissions');}};
 installRestEmojiRecovery(rest);
 await assert.rejects(()=>rest.request({body:payload}),/Missing Permissions/);
 assert.equal(n,1);
 n=0; const rest2={request:async()=>{n++;throw new Error('COMPONENT_INVALID_EMOJI');}};
 installRestEmojiRecovery(rest2);
 await assert.rejects(()=>rest2.request({body:{content:'sem componentes'}}),/COMPONENT_INVALID_EMOJI/);
 assert.equal(n,1);
});
