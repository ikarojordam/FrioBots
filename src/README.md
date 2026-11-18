# FrioBot

Bot de Discord para servidores de apostas Free Fire, lojas e comunidades (tickets, filas, PIX, streamers, roleta).

## Rodar localmente
```bash
cp .env.example .env     # preencha os valores (o .env nunca vai pro Git)
npm install
npm start
```
Requer Node 22.

## Variáveis de ambiente
Todas estão documentadas em [`.env.example`](.env.example). Obrigatórias: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `SUPABASE_URL`, `SUPABASE_KEY`.

## Deploy (Render ou similar)
Cadastre cada variável no painel do host (não use arquivo `.env` em produção). Comando de start: `npm start`.

## Comandos (9)
| Comando | Subcomandos |
|---|---|
| `/info` | ping, servidor, usuario, avatar, ajuda, status |
| `/perfil` | ver, aniversario, resgatar |
| `/comunidade` | sugestao, reportar, ia, versiculo (aleatorio/config/off) |
| `/musica` | tocar, pausar, pular, parar, fila, tocando, loop, volume |
| `/roleta` | painel, girar, ver, giros, coins |
| `/hub` · `/admin` · `/dev` | painéis |
| `/config` | ticket, streamer, painel (ticket/streamer) |

### Música por prefixo `m!` (qualquer membro, maiúsculas ou minúsculas)
`m!p <nome/link>` · `m!pause` · `m!next` · `m!stop` · `m!queue` · `m!np` · `m!loop` · `m!vol <0-200>` · `m!remove <pos>` · `m!clear` · `m!help`

## Loja
Pagamentos do Mercado Pago são conferidos sozinhos a cada 30s e o estoque é entregue por DM. PIX estático continua exigindo aprovação da staff.

## Segurança
Leia seção **Segurança** deste README antes do primeiro commit. Resumo: sem segredos no código, hook de pre-commit ativo, `ENABLE_DEV_EVAL=false`.

## Scripts
| Comando | O que faz |
|---|---|
| `npm start` | inicia o bot |
| `npm run check` | confere a sintaxe |
| `npm run scan:secrets` | procura segredos nos arquivos |
| `npm run audit:prod` | audita dependências de produção |

## Atualização de recursos (16/10/2026)
Os novos campos da loja e do hub de apostas dependem da migração `src/migrations/2026-10-16-frio-features.sql` no Supabase. **Esse arquivo não está incluído neste pacote** — use a sua cópia original (o bot só funciona nesses recursos depois de rodá-la). Para a verificação, rode `src/migrations/verification-panels.sql`. Os backups usam a tabela `guild_backups` existente. A restauração é best-effort: permissões e itens recriáveis são restaurados, mas IDs originais de canais/cargos não podem ser preservados e o Discord não permite reconstruir autoria original de mensagens.

## Atualização auditada v6.9.4 (17/11/2026)

Esta entrega **não é uma certificação de funcionamento em produção**. Mantém as funcionalidades do `src/index.js` legado e extraiu partes críticas para módulos sem recriar do zero as regras de tickets, loja e sistemas administrativos.

### Estrutura

- `src/interactionRouter.js` — dono único por interação; somente um listener `interactionCreate`; roteamento por namespace, proteção contra colisões e resposta de erro quando um ID não possui handler.
- `src/logger.js` — logs estruturados e filtro de campos sensíveis.
- `src/oauthState.js` — geração e validação HMAC do `state`, expiração e proteção de reuso.
- `src/discordClient.js` — cliente e caches limitados; parciais compatíveis com discord.js 14; remove versão de API v9 fixada manualmente.
- `src/supabaseClient.js` — inicialização Supabase e compatibilidade legada de builders.
- `src/app.js` — Express e cabeçalhos; rotas registradas antes de o servidor começar a escutar.
- `src/env.js` — validação inicial obrigatória.
- `src/monitor.js` — medição RSS, heap e memória externa.
- `src/tests/` — testes locais sem credenciais reais.
- `src/index.js` — módulos e funções de negócio legados preservados; ainda precisa ser gradualmente subdividido, com testes de regressão por função.

### Instalação Discloud

1. Instale dependências: `npm install` (necessita Internet). Recomendado Node.js 22 LTS.
2. Crie as variáveis de ambiente da `.env.example` **no painel da Discloud**. Não publique os valores no Git.
3. Configure `PUBLIC_BASE_URL` para o endereço HTTPS realmente acessível da sua aplicação e `REDIRECT_URI` para `https://SEU-ENDERECO/callback` **exatamente igual** ao redirect cadastrado no Discord Developer Portal.
4. Configure `DISCORD_CLIENT_SECRET` e um `VERIFY_SECRET` aleatório e estável, guardado no servidor, se utilizar OAuth2.
5. Execute `npm run verify` para validar o código e os testes sem APIs externas, depois `npm start` para conectá-lo ao Discord.
6. Para homologação, teste `/hub`, `/admin`, `/dev`, seletores, botões, modais, autorização, tickets e Supabase em servidor de teste antes de substituir a versão atual em produção.

**Importante:** com `TYPE=bot` na Discloud, confirme que o seu plano disponibiliza uma URL HTTPS pública com redirecionamento para o serviço HTTP. Se não disponibilizar, a verificação OAuth2 precisa de um serviço web público separado, por exemplo no Render, sem expor chaves no navegador. O endereço do painel deve permanecer estável, enquanto o `state` OAuth é criado somente na hora do login.

### Comandos de verificação

```bash
npm run check          # Sintaxe de todos os módulos atuais
npm test               # Testes unitários de router, segurança e estrutura
npm run scan:secrets   # Varredura de texto sensível
npm run verify         # Reúne os três checks anteriores
```

O `RAM=760` limita o plano, **não garante** que o processo respeitará essa memória. Observe os logs `memory` (`rssMB`) e execute um teste de carga real. `NETWORK_DIAGNOSTICS=true` ativa apenas temporariamente os diagnósticos de conexão extra. O arquivo `src/migrations/verification-panels.sql` existente não foi alterado; a migração antiga de loja ainda está ausente neste ZIP, como já informado no README original.

Leia também [seção Relatório de auditoria v6.9.4 deste README](seção Relatório de auditoria v6.9.4 deste README) antes do deploy.


---

# Documentação complementar consolidada

Os tópicos abaixo reúnem os antigos arquivos de documentação em um único README. Algumas observações são históricas de versões anteriores; prevalecem as configurações reais do código nesta versão.


---

## RELATORIO AUDITORIA v6.9.4

# Relatório técnico FrioBot — v6.9.4

**Base analisada:** `FrioBot-v6.9.3-corrigido.zip` recebido em 17/11/2026.

## Diagnóstico comprovado

- O pacote original tinha 22 entradas e continha `index.js` com **19.915 linhas**. Não incluía módulos separados de `commands`, `buttons`, `selects`, `modals` nem a migração de loja citada no README.
- Havia **12 registros `client.on('interactionCreate', …)`** (um para remapeamento, um para watchdog e dez handlers de interação), expostos à execução concorrente. Agora há **um listener** instalado pelo roteador com **10 rotas nomeadas**.
- O link da página `/verify/:guildId` redirecionava para o callback com `state=verify:<guildId>`, porém o callback exigia um estado HMAC `<guild>.<timestamp>.<nonce>.<signature>`. O fluxo estava incompatível. **Os painéis publicados também recebiam estados com validade de 10 minutos**. Os botões agora apontam para uma página pública estável que cria um estado temporário no momento do acesso.
- A validação do tipo de atividade do Discord confundia `ActivityType.Playing = 0` com valor inválido; corrigida com `hasOwnProperty`.
- O cliente tinha REST com `api=https://discordapp.com/api` e versão `9` fixados; removidos para utilizar padrões compatíveis do `discord.js 14`.
- Parciais da biblioteca passavam strings antigas; substituídas pelo enum `Partials`.
- Diagnósticos WSS/HTTP externos executavam a cada boot, independentemente da necessidade. Agora precisam de `NETWORK_DIAGNOSTICS=true`.
- O `index.js` cresceu sem isolamento formal entre HTTP, cliente Discord, banco e monitoramento, agora extraídos.
- Já existia aviso de `.catch()` no builder do Supabase e ajustes legados de ACK no pacote de origem; **não reivindicamos autoria nem validação completa** dessas correções anteriores.

## Correções implementadas

- Um único roteador, responsabilidades por ID e tipo de interação, sem ACK automático genérico; suporte a modais por resposta inicial.
- Colisões de rotas detectáveis, erros assíncronos capturados, resposta em IDs não encontrados e telemetria por responsável.
- Estado OAuth HMAC com TTL e nonce de uso único; links públicos de verificação persistentes.
- Inicializadores de cliente Discord, Supabase e Express em arquivos próprios, sem alterar a estrutura de dados existente.
- Validação de variáveis obrigatórias, monitoramento RSS + heap + external, fechamento do HTTP e do cliente ao receber SIGTERM/SIGINT.
- Exclusão das cópias redundantes `_backups-antigos/` do pacote de distribuição para evitar expor código e configurações anteriores; não exclui a funcionalidade de backups existente no código do bot.
- Desativação de imports não utilizados de Components V2, sem alterações cosméticas em massa nos embeds e emojis originais.

## Arquivos principais modificados / adicionados

| Arquivo | Alteração |
|---|---|
| `index.js` | Registro de 10 handlers no roteador, OAuth atualizado, extração dos inicializadores, controle de inicialização e shutdown |
| `src/interactionRouter.js` | Novo roteador único, logs de latência/ACK e detecção de colisões |
| `src/logger.js` | Novo log sanitizado |
| `src/discordClient.js` | Novo inicializador do Discord |
| `src/supabaseClient.js` | Novo inicializador Supabase |
| `src/app.js` | Novo inicializador Express |
| `src/oauthState.js` | Novo módulo HMAC/nonce |
| `src/env.js` | Nova validação de variáveis |
| `src/monitor.js` | Novo monitor de memória |
| `package.json` | Versão 6.9.4, `check`, `test`, `verify`, Node 22/24 |
| `discloud.config` | `RAM=760`, Node 22 |
| `.env.example` / `.discloudignore` | Opções de diagnóstico e deploy |
| `tests/*.test.js` | 18 testes unitários e estruturais |
| `README.md` | Documentação de instalação e limites |

## Resultado dos testes executados

- `node --check` para `index.js`, `emojis.js`, `ticket-gemini.js`, `src/**/*.js` e `tests/**/*.js`: **aprovado**.
- `npm test`: **18 testes aprovados; 0 falhas** (mock de interação, roteamento, duplicidade, ACK, modais, OAuth HMAC/TTL/replay, validação de ambiente e verificações estruturais).
- `npm run scan:secrets`: **nenhum segredo detectado** pelo scanner de texto fornecido.
- `npm install`: **tentativa com tempo esgotado** neste ambiente. Por isso, não foi possível iniciar o bot com todas as dependências instaladas; **a execução real não está validada**.

## Limitações e pendências (não ocultadas)

1. **Não foi executado teste real com Discord, Supabase, OAuth2 externo ou Discloud.** Uma resposta ACK correta no mock não garante tempo de rede inferior a 3s em cada uma das centenas de rotas internas.
2. A camada de **negócio do `index.js` ainda é grande**. A modularização é parcial e preserva comportamento legado; nova divisão de tickets, loja, moderação, música e apostas exige testes funcionais de regressão para não retirar recursos.
3. Sem acesso à estrutura e aos dados reais do Supabase, não se verificou integridade de todas as tabelas, políticas, consultas e migrações. **Não foi aplicado SQL destrutivo**. O arquivo de migração antigo da loja continua ausente do pacote original.
4. Não foi possível verificar **latência interna de 40 ms** nem **RSS abaixo de 760 MB**. O monitor apenas permite medir o processo na Discloud.
5. Não houve inspeção manual de cada ID dinâmico criado em runtime nem simulação real de todos os fluxos de botões, menus, modais, permissões, reconexões e tickets.
6. As telas legadas conservam emojis Unicode e textos originais além dos customizados. Não houve substituição em massa para evitar efeitos colaterais.
7. Gestão de usuários previamente autorizados por OAuth2, testes de aprovação/cargo, limites/rate limits e serviços de terceiros **necessitam homologação de integração e checagem de consentimento específico**; não há relatório comprovado de adição em servidor real.
8. O pacote não inclui `package-lock.json`: instalar dependências online é necessário; travar e auditar dependências deve ser feito em ambiente de build conectado à Internet.

**Conclusão:** pacote intermediário auditado, com correções estruturais reais e testes locais, **não** uma garantia de que todos os recursos do bot estejam corrigidos em produção. Substituir a instância ativa sem staging não é recomendado.


---

## AUDITORIA HANDLERS

# Auditoria dos handlers — correção de timeouts

Base: FrioBot-760MB-Hubs-Antigos-Corrigidos.zip.

## Identificação no código
- 12 registros `client.on('interactionCreate', ...)` espalhados pelo index.js (além de um listener de remapeamento de comandos). Não significa por si só que todos estejam em conflito, mas exige cuidado com ACK duplo.
- O handler principal realizava `guild.members.fetch()` e `guild.members.fetchMe()` ANTES de rotear qualquer botão. Essa chamada de rede pode exceder o prazo de 3 segundos.
- Verificações de manutenção consultavam Supabase, incluindo a configuração de apostas em interações que nem eram de apostas.
- Identificadas 135 chamadas `return i.update(await ...)` que geravam o painel ANTES de confirmar a interação.

## Alterações
- Afastadas buscas obrigatórias de membro e bot na entrada do handler global. A busca continua disponível nos fluxos em que é necessária.
- Para as 135 atualizações assíncronas de painel, `deferUpdate()` vem antes da geração do conteúdo, seguido de `editReply()`.
- Consulta de manutenção administrativa e de apostas restrita às interações a que se aplica.
- Cache de kill switch e manutenção global atualizado sem bloquear o clique durante a consulta; a configuração nova pode levar até a próxima atualização para surtir efeito. Recomendado monitorar isso.
- Checagem de permissões passa a tentar usar membro já presente no cache.
- Adicionado diagnóstico `[FRIO INTERACTION SLOW]` quando uma interação permanece sem confirmação após 2,2 segundos; ele mostra o `customId` problemático.
- Preservei embeds tradicionais e menus.

## Limites
- A revisão foi estática e sintática; não houve sessão autenticada com Discord ou Supabase.
- Existem outros caminhos com `reply(await ...)` e handlers secundários que podem continuar lentos; a instrumentação ajuda a identificar os casos reais.
- Não interprete sucesso de `node --check` como validação funcional de todos os cliques.


---

## CORRECOES v6.9.3

# Correções v6.9.3

## Causa raiz do "o app não respondeu a tempo"
A correção anterior gerou 76 linhas no formato
`if (x) await i.deferUpdate(); return i.editReply(...)`.
Sem chaves, o `return` rodava SEMPRE: só o primeiro botão de cada grupo funcionava e
os demais chamavam `editReply` sem ACK (33 trechos ficaram inalcançáveis).
Agora todas usam `if (x) { await i.deferUpdate(); return i.editReply(...); }`
(hubs /dev e /admin, loja, tickets, apostas FF, roleta, streamers, backup, blacklist).

## Outras correções
- 42 respostas `reply({...(await painel())})` agora fazem `deferReply` antes de gerar o painel.
- 53 checagens de permissão que retornavam em silêncio agora respondem "Sem permissão" (`denyInteraction`).
- Modal de editar backup: ACK imediato antes das consultas ao Supabase.
- Função `refreshFFStreamerPanel` duplicada removida.
- `.env.exemple` (duplicado, reprovava `npm run scan:secrets`) removido; `.env.example` completo e sem valores.
- `render.yaml`: removido `rootDir` inexistente; adicionadas variáveis OWNER_ID, PUBLIC_BASE_URL, VERIFY_SECRET.
- Doc Discloud corrigida (760 MB); README avisa que a migração SQL da loja não está no pacote.
- Backups antigos movidos para `_backups-antigos/` (ignorados no deploy via `.discloudignore`).
- `npm run check` agora cobre também `scripts/scan-secrets.js`. Versão 6.9.3.

## Validação
ESLint (no-undef, redeclare, unreachable etc.): 0 problemas. `node --check` e scan de segredos: OK.
Não foi possível testar contra Discord/Supabase reais neste ambiente.


---

## CORRECOES HUBS LEGACY

# Correções dos hubs — 760 MB

- /dev e /admin restaurados para embeds clássicos + menus select.
- Roteador dos menus raiz responde com deferUpdate() imediatamente, antes de consultar permissões/SQL.
- Handler principal ignora os IDs de menu já tratados pelo roteador dedicado, evitando duas respostas para a mesma interação.
- Publicação do painel de verificação deixa de gerar Components V2; configurações antigas com estilo v2 passam a publicar embed tradicional.
- Mantidos OAuth, teste, logs, cargos e seleção de quantidade no sistema de verificados.
- Discloud: 760 MB e Node LTS.

## Limites
A verificação de sintaxe não substitui testes em Discord/Discloud. Existem muitos handlers adicionais e eles podem exigir depuração própria. Confira os logs ao acionar botões internos.


---

## VERIFICACAO LEIA ME

# FrioBot — verificação personalizada

1. Execute `src/migrations/verification-panels.sql` no SQL Editor do Supabase. O bot necessita da chave `service_role` apenas no backend (jamais exponha em código frontend).
2. Configure `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (ou `SUPABASE_KEY`, conforme implementação atual), `VERIFY_SECRET` e `REDIRECT_URI`.
3. Configure no Discord Developer Portal o **exato** REDIRECT_URI público HTTPS terminando em `/callback`.
4. Abra `/admin` → Gerenciamento → Painéis → Verif para escolher visual, texto, URL de imagem, cargo, logs e publicação no canal.
5. O cargo só é entregue após o desafio ser validado **no servidor**. O botão não concede cargo. Necessário que o bot tenha `Gerenciar Cargos` e que o cargo esteja abaixo do cargo do bot.
6. O backend de OAuth/captcha requer servidor HTTP público acessível. A modalidade bot isolada da Discloud pode não publicar as rotas `/callback` e `/verify`; nesse caso hospede esse serviço web em uma instância com HTTP público e use o endereço na configuração.
7. O painel de desenvolvimento permite selecionar quantidade de usuários OAuth autorizados a tentar incluir no servidor. Não garante o número final: usuários já presentes, autorizações revogadas e limites do Discord afetam o total.

## Segurança
O teste antes era resolvido somente no navegador. Agora a resposta é conferida no backend, limitada a 5 tentativas, vinculada ao usuário autenticado e ao servidor. O `state` OAuth é assinado e expira em 10 minutos. Os desafios estão em memória: reiniciar o processo durante a verificação exige reiniciar o teste.


---

## DISCLOUD LEIA ME

# Implantação Discloud

O arquivo discloud.config está na raiz do ZIP. Configure as variáveis de ambiente no painel da hospedagem. Não coloque tokens reais no ZIP.

Este bot também possui APIs e callback OAuth via Express. O plano **bot** da Discloud não fornece uma URL pública HTTP; para manter painel e verificação OAuth, use hospedagem web com HTTPS separada ou uma modalidade **site** que exponha porta HTTP. Configure REDIRECT_URI para a URL pública exata /callback, e a mesma URL no Developer Portal do Discord. Sem isso, as funções HTTP/OAuth não funcionarão.

Painéis /dev e /admin agora têm tela inicial Components V2 com select menus, mantendo subpainéis existentes acessíveis por respostas privadas. A maioria dos subpainéis internos ainda é legado; a migração completa de todas as telas exige revisão de cada fluxo.

Verificados: o botão antigo que movia automaticamente todos os usuários foi substituído por convite voluntário com limite de usos; a quantidade de usos não garante a quantidade de pessoas que efetivamente entrarão.

Antes de subir, verifique que o token do bot e credenciais do banco foram revogados e rotacionados caso tenham sido publicados anteriormente.


---

## NODE LTS DISCLOUD

# Node.js LTS e 760 MB na Discloud

- `VERSION=latest` usa o Node.js LTS atual oferecido pela Discloud.
- `RAM=760` aloca 760 MB para o app, mas não garante consumo inferior ao limite.
- `package.json` aceita Node.js >=22 e <27.
- Confirme a versão real nos logs após reinstalar ou reconstruir o app.
- Se houver erro, envie as últimas linhas dos logs.
- Aviso: em hospedagem do tipo bot, rotas públicas OAuth podem precisar de um serviço web separado.


---

## SECURITY

# Segurança — FrioBot

## Regras de ouro
1. **Nenhum segredo no código ou no Git.** Token do bot, chave do Supabase, `*_SECRET`, tokens do Mercado Pago e webhooks ficam só em variáveis de ambiente (painel do host) ou no `.env` local, que está no `.gitignore`.
2. **`.env.example` só tem nomes**, nunca valores.
3. **Repositório privado**, com 2FA ligado na conta do GitHub.
4. **Eval/sandbox desligados** (`ENABLE_DEV_EVAL=false`). Quem executa código no bot lê `process.env` e o token. Ligue só para depurar e desligue depois.
5. **Poucos devs.** Quem está em `DEVELOPER_IDS`/`OWNER_ID` controla o bot inteiro (`!massdm`, `!globalban`, `!lockdown`...). Ative 2FA nessas contas do Discord.

## Ativar as proteções (uma vez)
```bash
git config core.hooksPath .githooks   # bloqueia commit com segredo
npm install                           # gera package-lock.json -> faça commit dele
```
No GitHub (Settings):
- **Code security** → ligue *Secret scanning* + *Push protection* + *Dependabot alerts*.
- **Branches** → proteja `main`: exigir pull request e o check "Segurança e qualidade".
- **Actions → General** → permissões do `GITHUB_TOKEN` somente leitura.

## Se um segredo vazou (ou pode ter vazado)
Apagar o arquivo **não basta**: o valor continua no histórico do Git. Faça nesta ordem:
1. **Rotacione** o segredo (o antigo passa a valer nada):
   - `DISCORD_TOKEN`: Developer Portal → Bot → *Reset Token*
   - `DISCORD_CLIENT_SECRET`: Developer Portal → OAuth2 → *Reset Secret*
   - `SUPABASE_KEY`: Supabase → Project Settings → API → regenerar a chave de serviço
   - `MP_ACCESS_TOKEN`: Mercado Pago → Suas integrações → renovar credenciais
   - `JWT_SECRET`, `PANEL_API_TOKEN`, `VERIFY_SECRET`: gere novos (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
2. Atualize as variáveis no host e reinicie.
3. Só então limpe o histórico (`git filter-repo` ou BFG) e force o push.

## Dados sensíveis no banco
- `verifications` guarda `access_token`/`refresh_token` OAuth dos usuários e `settings` guarda `mp_access_token` de cada servidor, **em texto puro**. Proteja o acesso ao Supabase (chave de serviço só no servidor, RLS ligado, backups privados) e considere criptografar esses campos.
- Nunca poste dumps do banco nem logs com tokens em issues/PRs.

## Reportar vulnerabilidade
Não abra issue pública. Fale direto com o dono do repositório (mensagem privada) com passos para reproduzir.


## Organização compacta em `src/`

Os arquivos JavaScript de produção foram reunidos diretamente em `src/`, sem subpastas para módulos. Testes, ferramentas auxiliares e migrações também ficam dentro de `src/` em `tests/`, `scripts/` e `migrations/`. Na raiz ficam apenas os arquivos exigidos pela hospedagem e o `README.md`. O ponto de entrada é `src/index.js`, configurado no `package.json` e `discloud.config`.


## Correção de inicialização — v6.9.4 (revisão de imports)

- Corrigido `src/monitor.js`: `require('../core/logger')` para `require('./logger')` após a unificação dos módulos em `src/`.
- Adicionado teste `src/tests/localImports.test.js` para validar a existência dos caminhos de todos os `require()` relativos literais.
- Esta correção resolve o `MODULE_NOT_FOUND` apresentado no log, não comprova funcionamento do bot conectado ao Discord/Supabase.

## Reconstrução dos comandos /dev e /admin (v6.9.4)

- Rota dedicada para abertura dos painéis, evitando verificações de manutenção e consultas ao banco antes de responder.
- `/dev`: exclusivo dos usuários configurados em `DEVELOPER_IDS` ou `OWNER_ID`.
- `/admin`: administradores do servidor, proprietário, desenvolvedores e cargo administrativo definido no banco.
- Categorias continuam ligadas às ações do projeto original, com botão de retorno ao menu inicial.
- Selects e painéis utilizam embeds tradicionais (sem Components V2).
- As ações internas legadas foram preservadas; algumas ainda dependem de configurações Supabase e teste em servidor real.

Para usar, reinstale os arquivos completos e reinicie o serviço. Não coloque tokens no arquivo compactado.

## Correção de emojis rejeitados (v6.9.5)

O Discord pode rejeitar componentes com `COMPONENT_INVALID_EMOJI` quando o emoji personalizado foi apagado, está indisponível ou não é utilizável pelo bot. `src/emojiRecovery.js` tenta o envio normal. Somente quando o Discord rejeita especificamente por emoji inválido, ele repete a operação uma vez sem os emojis personalizados dos componentes desse painel; IDs, rótulos, menus, embeds e lógica permanecem. Não são inseridos emojis Unicode. Emite `invalid_custom_emoji_recovered`. Para exibir todos os ícones, corrija os IDs em `src/emojis.js` e garanta o acesso do bot aos respectivos emojis.

**Outros avisos dos logs:** `Missing Permissions` na criação de cargo Dev requer permissão de Gerenciar Cargos e hierarquia adequada, não sendo corrigido pelo fallback; `JWT_SECRET ausente` desativa as rotas de painel correspondentes; `SIGTERM` registra encerramento externo/redeploy, não prova crash por memória. `ready` e `color` são avisos de depreciação que precisam de revisão separada.

**Validação:** 23 testes locais passaram, incluindo três testes específicos da recuperação de emoji. Não foi realizado teste real no Discord/Discloud.
