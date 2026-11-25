'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','prefixCommands.js'),'utf8');
const main=fs.readFileSync(path.join(__dirname,'..','index.js'),'utf8');
test('all requested prefix commands have dispatch branches',()=>{
  for(const cmd of ['lockall','unlockall','server','user','ban','expulsar','castigo','catigo','cargoall','clearall','dev','nick']) assert.match(source,new RegExp(`['\"]${cmd}['\"]`));
});
test('prefix menu and confirmations are owned by one interaction route',()=>{
  assert.match(main,/return cid\.startsWith\('frio_prefix:'\)/);
  assert.match(main,/registerPrefixCommands\(client, interactionRouter, \{ isDeveloper \}\)/);
  assert.match(source,/router\.register\('prefix-command-buttons'/);
  assert.match(source,/router\.register\('prefix-public-panel'/);
});
test('privileged commands restrict use and protect mass changes with confirmation',()=>{
  assert.match(source,/if\(!authorized\(m\)\)/);
  assert.match(source,/makeConfirm\(m,'cargoall'/);
  assert.match(source,/makeConfirm\(m,'clearall'/);
  assert.match(source,/makeConfirm\(m,cmd/);
});
test('mention reply is targeted and existing music prefix is untouched',()=>{
  assert.match(source,/Use \*\*\/ajuda\*\*/);
  assert.match(main,/const MUSIC_PREFIX_RE = \/\^m!/);
});
