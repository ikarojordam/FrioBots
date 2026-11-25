'use strict';
const {createHmac} = require('node:crypto');
const endpoint = 'https://frio-applications-verificacao.stilldeer6.chatgpt.site/api/bot-jobs';

async function applyJob(client, settings, job) {
  const guild = client.guilds.cache.get(job.guild);
  if (!guild) throw Error('O bot não encontrou o servidor.');
  const member = await guild.members.fetch({user:job.member,force:true});
  if (member.user.bot || member.pending) throw Error('Conclua a entrada e aceite as regras do servidor no Discord.');
  const config = await settings(job.guild);
  if (!config.role_id || !config.log_channel_id) throw Error('A equipe precisa configurar o cargo e o canal de logs no painel de verificação.');
  if (job.stage === 'oauth') return 'allowed';
  if (job.stage !== 'verified') throw Error('Estado de verificação inválido.');
  const channel = await guild.channels.fetch(config.log_channel_id);
  if (!channel?.isTextBased() || typeof channel.send !== 'function') throw Error('O canal de logs configurado está indisponível.');
  if (!member.roles.cache.has(config.role_id)) await member.roles.add(config.role_id,'Verificação confirmada pelo site');
  await channel.send({
    embeds:[{title:'Verificação concluída',color:0x22c55e,description:`Membro: <@${member.id}>\nCargo: <@&${config.role_id}>`,timestamp:new Date().toISOString()}],
    allowedMentions:{parse:[]}, nonce:job.id.slice(0,24), enforceNonce:true
  });
  return 'done';
}

function startSiteVerification(client,settings,secret) {
  if (!secret) return;
  const token=createHmac('sha256',secret.trim()).update('frio-job-channel-v1').digest('hex');
  async function post(payload) {
    const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify(payload),signal:AbortSignal.timeout(12000)});
    if (!response.ok) throw Error('HTTP '+response.status);
    return response.json();
  }
  async function poll() {
    let delay=4000;
    try {
      for (let count=0;count<10;count++) {
        const {job}=await post({action:'claim'});
        if (!job) break;
        let stage, error;
        try { stage=await applyJob(client,settings,job); }
        catch (cause) {
          stage='error';
          console.error('[verificação]',job.guild,job.member,cause.message);
          error=cause.code ? 'Confira as permissões e a hierarquia do cargo do bot e o acesso ao canal de logs.' : cause.message;
        }
        await post({action:'result',id:job.id,lease:job.lease,source:job.stage,stage,error});
      }
    } catch (cause) {
      delay=15000;
      console.error('[verificação/site]',cause.message);
    } finally { setTimeout(poll,delay).unref(); }
  }
  void poll();
}
module.exports={applyJob,startSiteVerification};
