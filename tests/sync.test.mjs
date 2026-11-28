import test from 'node:test';import assert from 'node:assert/strict';
import {ResultSync} from '../sync.js';
const storage=()=>{const data=new Map();return {get length(){return data.size;},key:i=>[...data.keys()][i],getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}};
function fakeApi(){let answers={},attempts=0;const ids=new Set();let offline=false;return {offline:v=>offline=v,answers:()=>answers,attempts:()=>attempts,fetch:async(url,options={})=>{if(offline)throw new Error('offline');if(!options.method)return new Response(JSON.stringify({answers,history:[]}));const e=JSON.parse(options.body);if(ids.has(e.eventId))return new Response(JSON.stringify({answers,history:[]}));if((answers[e.taskId]?.revision??0)!==e.baseRevision)return new Response(JSON.stringify({answers,history:[],error:'conflict'}),{status:409});ids.add(e.eventId);if(e.checked)attempts++;answers={...answers,[e.taskId]:{input:e.input,checked:e.checked,revision:e.baseRevision+1}};return new Response(JSON.stringify({answers,history:[]}));}};}
test('черновики и проверка сохраняются, повторное открытие восстанавливает ответы',async()=>{const api=fakeApi(),store=storage();const sync=new ResultSync({baseUrl:'https://x',token:'token',storage:store,fetcher:api.fetch});await sync.start();sync.enqueue('a1','1',false);sync.enqueue('a1','12',false);assert.equal(sync.pending.length,2);sync.enqueue('a1','12',true);await sync.flush();assert.equal(api.attempts(),1);assert.equal(api.answers().a1.input,'12');const second=new ResultSync({baseUrl:'https://x',token:'token',storage:store,fetcher:api.fetch});await second.start();assert.equal(second.snapshot().answers.a1.input,'12');assert.equal(second.pending.length,0);});

test('другая вкладка не стирает очередь несохранённых ответов',async()=>{const api=fakeApi(),store=storage();const first=new ResultSync({baseUrl:'https://x',token:'token',storage:store,fetcher:api.fetch}),second=new ResultSync({baseUrl:'https://x',token:'token',storage:store,fetcher:api.fetch});await first.start();await second.start();first.enqueue('g1','5',true);await second.refresh();const reopened=new ResultSync({baseUrl:'https://x',token:'token',storage:store,fetcher:api.fetch});assert.equal(reopened.pending.length,1);await reopened.start();assert.equal(api.answers().g1.input,'5');assert.equal(api.attempts(),1);});
test('offline очередь переживает закрытие страницы и отправляется после возврата',async()=>{const api=fakeApi(),store=storage();const sync=new ResultSync({baseUrl:'https://x',token:'token',storage:store,fetcher:api.fetch});await sync.start();api.offline(true);sync.enqueue('g1','5',true);await sync.flush();assert.equal(sync.pending.length,1);const reopened=new ResultSync({baseUrl:'https://x',token:'token',storage:store,fetcher:api.fetch});await reopened.start();assert.equal(reopened.snapshot().answers.g1.input,'5');api.offline(false);await reopened.flush();assert.equal(api.answers().g1.input,'5');assert.equal(api.attempts(),1);});
test('учитель не пишет ответы; конфликт не перезаписывает чужой результат',async()=>{const api=fakeApi(),store=storage();const sync=new ResultSync({baseUrl:'https://x',token:'token',storage:store,fetcher:api.fetch});await sync.start();sync.enqueue('a1','old',true);await api.fetch('https://x/api/change',{method:'POST',body:JSON.stringify({taskId:'a1',input:'new',checked:true,baseRevision:0,eventId:'different-event'})});await sync.flush();assert.equal(sync.status,'conflict');assert.equal(api.answers().a1.input,'new');assert.equal(sync.snapshot().answers.a1.input,'old');const teacher=new ResultSync({baseUrl:'https://x',token:'teacher',role:'teacher',storage:storage(),fetcher:api.fetch});await teacher.start();assert.throws(()=>teacher.enqueue('a1','bad',true),/read.only/);});

test('потерянное подтверждение черновика не теряет следующую проверку после перезагрузки',async()=>{const api=fakeApi(),store=storage();let lose=true;const fetcher=async(url,options)=>{const result=await api.fetch(url,options);if(options?.method&&lose){lose=false;throw new Error('response lost');}return result;};const sync=new ResultSync({baseUrl:'https://x',token:'token',storage:store,fetcher});await sync.start();sync.enqueue('a1','1',false);await sync.flush();assert.equal(sync.status,'offline');const reopened=new ResultSync({baseUrl:'https://x',token:'token',storage:store,fetcher});reopened.enqueue('a1','12',true);assert.equal(reopened.pending.length,2);await reopened.start();assert.equal(api.answers().a1.input,'12');assert.equal(api.answers().a1.checked,true);assert.equal(api.attempts(),1);assert.equal(reopened.pending.length,0);});

test('новая домашняя u1-u15 восстанавливает очередь после перезагрузки',async()=>{
 const api=fakeApi(),store=storage();
 const first=new ResultSync({baseUrl:'https://x',token:'token',storage:store,fetcher:api.fetch});
 await first.start();
 api.offline(true);
 first.enqueue('u4','26/3',true);
 first.enqueue('u15','-48',true);
 await first.flush();
 const reopened=new ResultSync({baseUrl:'https://x',token:'token',storage:store,fetcher:api.fetch});
 assert.equal(reopened.pending.length,2);
 api.offline(false);
 await reopened.start();
 assert.equal(api.answers().u4.input,'26/3');
 assert.equal(api.answers().u15.input,'-48');
 assert.equal(reopened.pending.length,0);
});

test('третьи домашние по обоим предметам сохраняют очередь после перезагрузки',async()=>{
 const api=fakeApi(),store=storage();
 const first=new ResultSync({baseUrl:'https://x',token:'token',storage:store,fetcher:api.fetch});
 await first.start();api.offline(true);
 first.enqueue('l3a15','-2',true);first.enqueue('l3g10','35',true);
 await first.flush();
 const restored=new ResultSync({baseUrl:'https://x',token:'token',storage:store,fetcher:api.fetch});
 assert.equal(restored.pending.length,2);
 api.offline(false);await restored.start();
 assert.equal(api.answers().l3a15.input,'-2');
 assert.equal(api.answers().l3g10.input,'35');
 assert.equal(restored.pending.length,0);
});
