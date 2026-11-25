'use strict';
/** FrioBot prefix commands. One message handler and one interaction router owner. */
const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const { log } = require('./logger');
const PREFIX = '+';
const ACTION_TTL = 120000;
const pending = new Map();
const locksFile = path.join(__dirname, '..', 'data', 'prefix-locks.json');
let lockMemory = {};
try { lockMemory = JSON.parse(fs.readFileSync(locksFile, 'utf8')); } catch { /* first run */ }
const saveLocks = () => { fs.mkdirSync(path.dirname(locksFile), { recursive: true }); const temporary = locksFile + '.tmp'; fs.writeFileSync(temporary, JSON.stringify(lockMemory)); fs.renameSync(temporary, locksFile); };
const info = (title, description) => new EmbedBuilder().setColor(0x5865f2).setTitle(title).setDescription(description).setTimestamp();
const short = (s, max=1800) => String(s || '').slice(0,max);
const safeReply = async (message, text) => message.reply({ content: short(text), allowedMentions: { parse: [], repliedUser: false } }).catch(e => log('warn','prefix_reply_error',{error:e.message}));
const audit = (command, message, details='') => log('info','prefix_command',{command,guild:message.guild.id,user:message.author.id,details:short(details,350)});
const parseId = input => (String(input || '').match(/^<@!?(\d{15,25})>$/) || String(input || '').match(/^(\d{15,25})$/))?.[1] || null;
const parseRoleId = input => (String(input || '').match(/^<@&(\d{15,25})>$/) || String(input || '').match(/^(\d{15,25})$/))?.[1] || null;
const parseDuration = value => {const m=String(value||'').match(/^(\d+)(m|h|d)$/i); if(!m)return null;const n=Number(m[1])*({m:60000,h:3600000,d:86400000}[m[2].toLowerCase()]);return n >= 60000 && n <= 28*86400000?n:null;};
const manageable = (actor, bot, target, guild) => target && target.id !== guild.ownerId && target.id !== bot.id && target.id !== actor.id && target.manageable && (actor.id===guild.ownerId || actor.roles.highest.comparePositionTo(target.roles.highest)>0);
function registerPrefixCommands(client, router, { isDeveloper }) {
  const authorized = m => isDeveloper(m.author.id) || m.guild.ownerId === m.author.id;
  const memberMe = async guild => guild.members.me || guild.members.fetchMe();
  const auditError = async (m, cmd, err) => { log('error','prefix_error',{command:cmd,guild:m.guild.id,error:err?.message||String(err)}); await safeReply(m,`Não foi possível executar \`+${cmd}\`: ${short(err?.message || 'erro inesperado',300)}`); };
  function makeConfirm(m, type, label, data) {
    for (const [k, v] of pending) if (v.expires < Date.now()) pending.delete(k);
    const key = require('node:crypto').randomBytes(9).toString('hex');
    pending.set(key, { userId:m.author.id, guildId:m.guild.id, type, data, expires: Date.now()+ACTION_TTL });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`frio_prefix:confirm:${key}`).setLabel('Confirmar').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`frio_prefix:cancel:${key}`).setLabel('Cancelar').setStyle(ButtonStyle.Secondary));
    return m.reply({ embeds:[info('Confirmação necessária',label)], components:[row], allowedMentions:{parse:[],repliedUser:false} });
  }
  const checkBot = async (m, permission) => {const me=await memberMe(m.guild);if (!me.permissions.has(permission)) {await safeReply(m,`Preciso da permissão **${String(permission.description||'adequada')}** para executar essa ação.`);return null;}return me;};
  async function runLockAll(guild, lock) {
    const me=await memberMe(guild);
    if(!me.permissions.has(PermissionFlagsBits.ManageRoles)) throw Error('O bot precisa da permissão Gerenciar Cargos para editar permissões de canais.');
    const root = lockMemory[guild.id] || {};
    let changed=0, failures=0;
    const channels = [...guild.channels.cache.values()].filter(c => [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum, ChannelType.GuildMedia].includes(c.type) && c.permissionOverwrites && c.manageable);
    for (const c of channels) {
      try {
        if(lock) {
          if(Object.hasOwn(root,c.id)) continue;
          const o=c.permissionOverwrites.cache.get(guild.roles.everyone.id);
          root[c.id]=o?.allow.has(PermissionFlagsBits.SendMessages)?'allow':o?.deny.has(PermissionFlagsBits.SendMessages)?'deny':'inherit';
          lockMemory[guild.id]=root;saveLocks();
          await c.permissionOverwrites.edit(guild.roles.everyone.id,{SendMessages:false},{reason:'FrioBot +lockall'});
        } else {
          if(!Object.hasOwn(root,c.id)) continue;
          const prior=root[c.id];
          await c.permissionOverwrites.edit(guild.roles.everyone.id,{SendMessages: prior==='allow'?true:prior==='deny'?false:null},{reason:'FrioBot +unlockall'});
          delete root[c.id];saveLocks();
        }
        changed++;
      } catch(e){failures++;log('warn','prefix_lock_channel_failed',{guild:guild.id,channel:c.id,error:e.message});}
    }
    if(!lock && Object.keys(root).length===0){delete lockMemory[guild.id];saveLocks();}
    return {changed,failures};
  }
  async function executeConfirmed(i, task) {
    const g=i.guild;
    const member = await g.members.fetch(i.user.id).catch(()=>null);
    if(!member || !(isDeveloper(i.user.id)||g.ownerId===i.user.id)) throw Error('Permissão insuficiente.');
    const me=await memberMe(g);
    const canDelete = me.permissions.has(PermissionFlagsBits.ManageMessages) && i.channel?.permissionsFor(me)?.has(PermissionFlagsBits.ManageMessages);
    if(task.type==='lockall' || task.type==='unlockall') {
      const result=await runLockAll(g,task.type==='lockall');
      audit(task.type,{guild:g,author:i.user},JSON.stringify(result));
      return `Canais alterados: **${result.changed}**. Falhas: **${result.failures}**.`;
    }
    if(task.type==='cargoall') {
      if(!me.permissions.has(PermissionFlagsBits.ManageRoles)) throw Error('O bot precisa de Gerenciar Cargos.');
      const role=await g.roles.fetch(task.data.roleId);
      if(!role||role.id===g.id||role.managed||role.position>=me.roles.highest.position)throw Error('Cargo indisponível ou acima do bot.');
      const members=await g.members.fetch();
      let added=0, skipped=0, failed=0;
      for(const m of members.values()) {
        if(m.user.bot || m.roles.cache.has(role.id) || !m.manageable){skipped++;continue;}
        try{await m.roles.add(role,'FrioBot +cargoall autorizado');added++;}catch(e){failed++;log('warn','prefix_cargoall_member_failed',{guild:g.id,error:e.message});}
      }
      audit('cargoall',{guild:g,author:i.user},`${role.id} added=${added} failed=${failed}`);
      return `Cargo <@&${role.id}>: **${added}** adicionados, **${skipped}** ignorados, **${failed}** falhas.`;
    }
    if(task.type==='clearall') {
      if(!canDelete || !i.channel?.bulkDelete)throw Error('O bot precisa de Gerenciar Mensagens neste canal.');
      let removed=0, rounds=0;
      // Bulk deletion only supports messages newer than 14 days; 5,000 per request prevents infinite loops.
      while(rounds++<50){
        const batch=await i.channel.messages.fetch({limit:100});
        const eligible=batch.filter(m=>m.id!==i.message.id && Date.now()-m.createdTimestamp < 14*86400000);
        if(!eligible.size)break;
        const removedBatch=await i.channel.bulkDelete(eligible,true);
        removed+=removedBatch.size;
        if(removedBatch.size===0 || batch.size<100)break;
      }
      audit('clearall',{guild:g,author:i.user},`channel=${i.channelId} removed=${removed}`);
      return `Mensagens recentes removidas: **${removed}**. Mensagens com 14 dias ou mais não podem ser apagadas em lote pela API.`;
    }
    throw Error('Operação desconhecida.');
  }
  router.register('prefix-command-buttons',i=>i.isButton()&&i.customId?.startsWith('frio_prefix:'), async i => {
    const [,verb,key]=i.customId.split(':');
    const task=pending.get(key);
    if(!task || task.expires<Date.now()) {pending.delete(key);return i.reply({content:'Confirmação expirada. Execute o comando novamente.',flags:MessageFlags.Ephemeral});}
    if(task.userId!==i.user.id || task.guildId!==i.guildId)return i.reply({content:'Somente quem executou o comando pode confirmar.',flags:MessageFlags.Ephemeral});
    pending.delete(key);
    if(verb==='cancel') return i.update({content:'Operação cancelada.',embeds:[],components:[]});
    await i.update({content:'Operação confirmada. Processando...',embeds:[],components:[]});
    try {const response=await executeConfirmed(i,task);await i.editReply({content:response,allowedMentions:{parse:[]}});} catch(e){log('error','prefix_confirm_error',{guild:i.guildId,error:e.message});await i.editReply({content:`Falha: ${short(e.message,450)}`}).catch(()=>{});}
  });
  router.register('prefix-public-panel',i=>i.isStringSelectMenu()&&i.customId==='frio_prefix:public_panel', async i=>{
    const choice=i.values[0];
    const content={premium:'**Premium FrioBot:** planos Basic, Premium, Ultra e Unlimited. Consulte o desenvolvedor para condições e ativação.',comandos:'Use **/ajuda** para conhecer os comandos e os recursos do bot.',suporte:'Para suporte, utilize os canais de atendimento configurados neste servidor.',status:`**FrioBot:** online. Latência de gateway: **${client.ws.ping} ms**.`}[choice]||'Opção inválida.';
    await i.reply({content,flags:MessageFlags.Ephemeral});
  });
  client.on('messageCreate', async m=>{
    if(!m.guild||m.author.bot||!m.content)return;
    const content=m.content.trim();
    if(client.user && (content===`<@${client.user.id}>` || content===`<@!${client.user.id}>`)){
      await safeReply(m,'Use **/ajuda** para conhecer meus comandos, funcionalidades e dicas.');return;
    }
    if(!content.startsWith(PREFIX))return;
    const parts=content.slice(1).trim().split(/\s+/);
    const cmd=(parts.shift()||'').toLowerCase();
    const names=new Set(['lockall','unlockall','server','user','ban','expulsar','castigo','catigo','cargoall','clearall','dev','nick']);
    if(!names.has(cmd))return;
    if(!authorized(m)){await safeReply(m,'Este comando é exclusivo dos desenvolvedores do FrioBot e do dono do servidor.');return;}
    audit(cmd,m);
    try {
      const me=await memberMe(m.guild);
      if(cmd==='server') {
        if(parts[0]==='id')return safeReply(m,`ID de **${m.guild.name}**: \`${m.guild.id}\``);
        if(parts[0]==='icon') {const icon=m.guild.iconURL({size:1024});return m.reply({embeds:[icon?info('Ícone do servidor',icon).setImage(icon):info('Ícone do servidor','Este servidor não possui ícone.')],allowedMentions:{parse:[]}});}
        return safeReply(m,'Use `+server icon` ou `+server id`.');
      }
      if(cmd==='user') {const id=parseId(parts[0]);return safeReply(m,id?`ID do usuário: \`${id}\``:'Use `+user @membro`.');}
      if(cmd==='dev') {
        if(parts[0]!=='p')return safeReply(m,'Use `+dev p` para publicar o painel.');
        const select=new StringSelectMenuBuilder().setCustomId('frio_prefix:public_panel').setPlaceholder('Escolha uma opção').addOptions([
          {label:'Premium',value:'premium',description:'Conheça os planos'},
          {label:'Comandos',value:'comandos',description:'Como usar o FrioBot'},
          {label:'Suporte',value:'suporte',description:'Canais de atendimento'},
          {label:'Status',value:'status',description:'Informações do bot'}]);
        await m.channel.send({embeds:[info('FRIO BOT — CENTRAL DE INFORMAÇÕES','Conheça os planos Premium, comandos, suporte e o status do bot.\nSelecione uma opção abaixo.')],components:[new ActionRowBuilder().addComponents(select)]});return;
      }
      if(cmd==='lockall'||cmd==='unlockall')return makeConfirm(m,cmd,`${cmd==='lockall'?'Trancar':'Restaurar'} permissões de envio de mensagens nos canais de texto disponíveis?`,{});
      if(cmd==='cargoall') {
        const roleId=parseRoleId(parts[0]);const role=roleId?await m.guild.roles.fetch(roleId).catch(()=>null):null;
        if(!role)return safeReply(m,'Use `+cargoall @cargo`.');
        if(!me.permissions.has(PermissionFlagsBits.ManageRoles)||role.managed||role.id===m.guild.id||role.position>=me.roles.highest.position)return safeReply(m,'O bot não pode gerenciar esse cargo.');
        return makeConfirm(m,'cargoall',`Adicionar **${role.name}** aos membros elegíveis de **${m.guild.name}**? Isso pode levar algum tempo.`,{roleId});
      }
      if(cmd==='clearall'){
        if(!me.permissions.has(PermissionFlagsBits.ManageMessages)||!m.channel.permissionsFor(me)?.has(PermissionFlagsBits.ManageMessages))return safeReply(m,'O bot precisa de Gerenciar Mensagens neste canal.');
        return makeConfirm(m,'clearall',`Apagar as mensagens recentes deste canal (até 5.000, com menos de 14 dias)?`,{});
      }
      const id=parseId(parts[0]);
      if(!id)return safeReply(m,`Informe um membro válido. Exemplo: \`+${cmd} @membro${cmd==='nick'?' Novo Nome':cmd==='castigo'||cmd==='catigo'?' 1h':''}\`.`);
      const target=await m.guild.members.fetch(id).catch(()=>null);
      if(!target)return safeReply(m,'Membro não encontrado neste servidor.');
      if(cmd==='nick'){
        const nick=parts.slice(1).join(' ').trim();
        if(!nick||nick.length>32)return safeReply(m,'Use `+nick @membro Novo Nome` (máximo 32 caracteres).');
        if(!me.permissions.has(PermissionFlagsBits.ManageNicknames)||!manageable(m.member,me,target,m.guild))return safeReply(m,'O bot não pode alterar o apelido desse membro devido às permissões/hierarquia.');
        await target.setNickname(nick,`+nick por ${m.author.id}`);audit(cmd,m,`target=${id}`);return safeReply(m,`Apelido de <@${id}> alterado para **${nick}**.`);
      }
      if(!manageable(m.member,me,target,m.guild))return safeReply(m,'Não é possível moderar esse membro por causa das permissões ou hierarquia de cargos.');
      if(cmd==='ban'){
        if(!me.permissions.has(PermissionFlagsBits.BanMembers)||!target.bannable)return safeReply(m,'Não tenho permissão para banir esse membro.');
        await target.ban({reason:`+ban por ${m.author.id}`});audit(cmd,m,`target=${id}`);return safeReply(m,`Usuário <@${id}> banido.`);
      }
      if(cmd==='expulsar'){
        if(!me.permissions.has(PermissionFlagsBits.KickMembers)||!target.kickable)return safeReply(m,'Não tenho permissão para expulsar esse membro.');
        await target.kick(`+expulsar por ${m.author.id}`);audit(cmd,m,`target=${id}`);return safeReply(m,`Usuário <@${id}> expulso.`);
      }
      if(cmd==='castigo'||cmd==='catigo'){
        const duration=parseDuration(parts[1]);
        if(!duration)return safeReply(m,'Use `+castigo @membro 10m`, `1h` ou `1d` (máximo 28 dias).');
        if(!me.permissions.has(PermissionFlagsBits.ModerateMembers)||!target.moderatable)return safeReply(m,'Não tenho permissão para aplicar castigo nesse membro.');
        await target.timeout(duration,`+castigo por ${m.author.id}`);audit(cmd,m,`target=${id} duration=${duration}`);return safeReply(m,`Castigo aplicado a <@${id}> por **${parts[1]}**.`);
      }
    }catch(e){await auditError(m,cmd,e);}
  });
}
module.exports={registerPrefixCommands,parseDuration,parseId,parseRoleId};
