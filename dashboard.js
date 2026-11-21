import {vprSubjects, loadVpr} from './vpr.js';
import {gradeVpr} from './vpr-grade.js';
import {diagramSVG} from './tasks.js';
import {newHomework} from './new-homework.js';
const subjects = {
  algebra: {name:'Алгебра',theme:'Умножение многочленов',tasks:newHomework.algebra},
  geometry: {name:'Геометрия',theme:'Признаки равенства треугольников',tasks:newHomework.geometry},
  algebra2: {name:'Алгебра',theme:'Общий множитель и группировка',tasks:newHomework.algebra2},
  geometry2: {name:'Геометрия',theme:'Равнобедренный треугольник',tasks:newHomework.geometry2},
  ...vprSubjects,
};
function selectedWork(){
  const key=location.hash.slice(1);
  return key==="vpr"||Object.hasOwn(subjects,key)?key:'algebra';
}
import {parseAnswer,isCorrect} from './checker.js';
import {ResultSync} from './sync.js';
import {readAccount,setBeforeLogout} from './account.js';
import {SYNC_CONFIG} from './sync-config.js';
const access=readAccount(),shared=Boolean(SYNC_CONFIG.enabled&&access),teacher=shared&&access.role==='teacher';
const storageKey=shared?'math-view-v1-'+(access.token.slice(0,18)||'student'):'math-homework-v1';
let sync,cloud={answers:{},history:[]},ready=!shared,saveTimer;
let saved={};
try {const value=JSON.parse(localStorage.getItem(storageKey)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))saved=value;}catch{}
let current=selectedWork();
const $=selector=>document.querySelector(selector);
function store(){try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{}}
function state(id){const item=saved[id];return item&&typeof item.input==='string'?item:{input:'',checked:false};}
function queue(id,input,checked){if(!shared)return;sync.enqueue(id,input,checked);clearTimeout(saveTimer);if(checked)void sync.flush();else saveTimer=setTimeout(()=>void sync.flush(),600);}
function formatDate(value){return value?new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'';}
function grade(task,input){return task.key?gradeVpr(input,task.key):isCorrect(input,task.answer);}
function updateProgress(){
 const tasks=subjects[current]?.tasks;
 if(!tasks?.length)return;
 const isVpr=current.startsWith('vpr-');
 const count=tasks.filter(task=>{
   const item=state(task.id);
   return item.checked&&(task.key?.manual||grade(task,item.input));
 }).length;
 $('#progress-text').textContent=count+' из '+tasks.length+(isVpr?' выполнено':' решено');
 $('#progress').max=tasks.length;
 $('#progress').value=count;
 $('#progress').setAttribute('aria-label',isVpr?'Выполнено заданий':'Правильно решено');
 $('#completion').hidden=isVpr||count!==tasks.length;
}
function keyLabel(key){
 if(key.solution)return key.solution;
 if(key.manual)return 'Проверяется по решению.';
 if(key.parts)return key.parts.map((part,i)=>(i+1)+') '+keyLabel(part)).join(' · ');
 if(key.range)return key.range.join(' – ');
 return (key.answers||[]).join(' или ');
}
function renderState(card,task,item){
 card.classList.remove('checked-correct','checked-wrong');const feedback=card.querySelector('.feedback'),status=card.querySelector('.task-status');feedback.textContent='';status.textContent='';
 card.querySelector('.answer-input').removeAttribute('aria-invalid');
 if(!item.checked)return;
 if(task.key?.manual){feedback.textContent='Передано на проверку.';return;}
 if(!task.key&&parseAnswer(item.input)===null){feedback.textContent='Введи число или дробь, например 3/4.';card.querySelector('.answer-input').setAttribute('aria-invalid','true');return;}
 if(grade(task,item.input)){card.classList.add('checked-correct');feedback.textContent=task.key?.written?'Ответ верный.':'Верно.';status.textContent='✓';}
 else {card.classList.add('checked-wrong');feedback.textContent='Пока неверно. Попробуй ещё раз.';card.querySelector('.answer-input').setAttribute('aria-invalid','true');}
}
function render(){
 const listing=current==='vpr', diagnostic=listing||current.startsWith('vpr-');
 const section=diagnostic?'vpr':current.replace(/2$/,'');
 document.querySelectorAll('[data-subject]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.subject===section)));
 $('.intro').hidden=diagnostic;
 $('#variant-list').hidden=!listing;
 $('.workspace').hidden=listing;
 if(listing){document.title='Варианты ВПР';$('#tasks').replaceChildren();return;}
 const subject=subjects[current],number=current.endsWith('2')?2:1;
 document.title=subject.theme+' · '+subject.name;
 $('.homeworks').hidden=diagnostic;
 $('.workspace').classList.toggle('diagnostic',diagnostic);
 $('#back-to-variants').hidden=!diagnostic;
 const waiting = diagnostic && !subject.tasks.length;
 $('.assignment').classList.toggle('loading-variant', waiting);
 if(waiting){
   const route=current;
   $('#task-meta').textContent='ВПР · 7 класс';
   $('#assignment-title').textContent=subject.theme;
   $('#tasks').textContent='Загрузка заданий…';
   loadVpr().then(()=>{if(current===route)render();}).catch(()=>{
     if(current!==route)return;
     const retry=document.createElement('button');
     retry.type='button';retry.className='check';retry.textContent='Повторить загрузку';
     retry.onclick=render;$('#tasks').replaceChildren('Не удалось загрузить задания. ',retry);
   });
   return;
 }
 if(!diagnostic){
   document.title=subject.name+' · Домашняя № '+number;
   const buttons=document.querySelectorAll('.homework');
   for(let i=0;i<2;i++){
     const button=buttons[i];
     button.disabled=false;
     button.innerHTML='<span>0'+(i+1)+'</span>Домашняя № '+(i+1);
     button.classList.toggle('active',i+1===number);
     if(i+1===number)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
     button.onclick=()=>{location.hash=section+(i?'2':'');};
   }
 }
 $('#task-meta').textContent=diagnostic?'ВПР · 7 класс':'Домашняя № '+number+' · '+subject.tasks.length+' заданий';
 $('#assignment-title').textContent=subject.theme;
 if(!teacher)$('.answer-help').textContent=section==='geometry'?'Запиши доказательство в тетради: соответствие вершин, равные элементы и признак. В поле введи число из последнего вопроса.':'';
 const container=$('#tasks');container.replaceChildren();
 subject.tasks.forEach((task,index)=>{
  const card=document.createElement('article');card.className='task';card.dataset.taskId=task.id;
  const head=document.createElement('div');head.className='task-number';head.innerHTML=`<span>Задание ${index+1}</span><span class="task-status" aria-hidden="true"></span>`;card.append(head);
  if(task.images){for(const [part,src] of task.images.entries()){const img=document.createElement('img');img.src=src;img.alt=(task.imageAlts?.[part]||(part===0?task.alt:'Продолжение условия'))||('Условие задания '+(index+1));img.className='vpr-image';img.loading=index<2?'eager':'lazy';const zoom=document.createElement('a');zoom.className='vpr-zoom';zoom.href=src;zoom.target='_blank';zoom.rel='noopener noreferrer';zoom.title='Увеличить условие';zoom.append(img);card.append(zoom);}}
  if(task.math){const expression=document.createElement('div');expression.className='expression';expression.setAttribute('role','math');expression.setAttribute('aria-label',task.accessible);expression.innerHTML=task.math;expression.querySelector('math').setAttribute('aria-hidden','true');card.append(expression);}
  if(task.prompt){const prompt=document.createElement('p');prompt.className='task-prompt';prompt.textContent=task.prompt;card.append(prompt);}
  if(task.diagram){const diagram=document.createElement('div');diagram.className='diagram';diagram.innerHTML=diagramSVG(task.diagram);card.append(diagram);}
  if(teacher){
   const item=state(task.id),answer=document.createElement('p');answer.className='teacher-answer';answer.textContent=item.input?'Ответ: '+item.input:'Ответа пока нет';card.append(answer);
   const status=document.createElement('p');status.className='teacher-state';status.textContent=item.checked?(task.key?.manual?'На проверке':item.correct?'Верно':'Неверно'):(item.input?'Не проверен':'Не начато');if(item.checked&&item.correct===false)status.classList.add('wrong');card.append(status);
   const detail=document.createElement('p');detail.className='teacher-detail';detail.textContent=`Попыток: ${item.attempts||0} · Ошибочных: ${item.wrongCount||0}`+(item.updatedAt?' · '+formatDate(item.updatedAt):'');card.append(detail);if(task.key){const key=document.createElement("p");key.textContent="Ключ: "+keyLabel(task.key);card.append(key);}container.append(card);return;
  }
  const form=document.createElement('form');form.className='answer-form';form.noValidate=true;
  const wrapper=document.createElement('div');wrapper.className='input-wrap';const input=document.createElement(task.key?.manual?'textarea':'input');input.className='answer-input';if(!task.key?.manual)input.type='text';input.inputMode='text';input.autocomplete='off';input.spellcheck=false;input.maxLength=task.key?.manual?2000:100;input.placeholder=task.key?.manual?'Твой ответ':'Ответ';input.setAttribute('aria-label',`Ответ на задание ${index+1}`);input.setAttribute('aria-describedby',`feedback-${task.id}`);input.value=state(task.id).input;wrapper.append(input);
  if(task.unit){const unit=document.createElement('span');unit.className='input-unit';unit.textContent=task.unit;unit.setAttribute('aria-hidden','true');wrapper.append(unit);}
  const button=document.createElement('button');button.type='submit';button.className='check';button.textContent=task.key?.manual?'Отправить':'Проверить';input.disabled=!ready;button.disabled=!ready;form.append(wrapper,button);card.append(form);
  const feedback=document.createElement('p');feedback.className='feedback';feedback.id=`feedback-${task.id}`;feedback.setAttribute('aria-live','polite');card.append(feedback);
  input.addEventListener('input',()=>{saved[task.id]={input:input.value,checked:false};renderState(card,task,saved[task.id]);updateProgress();store();queue(task.id,input.value,false);});
  form.addEventListener('submit',event=>{event.preventDefault();if(!input.value.trim()){input.focus();return;}saved[task.id]={input:input.value,checked:true};renderState(card,task,saved[task.id]);updateProgress();store();queue(task.id,input.value,true);});
  renderState(card,task,state(task.id));container.append(card);
 });updateProgress();if(teacher)renderTeacherSummary();
}
function renderTeacherSummary(){
 const tasks=subjects[current].tasks,wrong=tasks.filter(t=>state(t.id).checked&&state(t.id).correct===false).length,unverified=tasks.filter(t=>(!state(t.id).checked||state(t.id).correct===null)).length;$('#teacher-summary').textContent=`Неверных: ${wrong} · Ещё не проверено: ${unverified}`;
 const list=$('#attempt-history');list.replaceChildren();const entries=(cloud.history||[]).filter(e=>tasks.some(t=>t.id===e.taskId)).slice(0,20);for(const item of entries){const li=document.createElement('li');li.textContent=`${formatDate(item.at)} · Задание ${tasks.findIndex(t=>t.id===item.taskId)+1} · Ответ: ${item.input||'пусто'} · ${item.correct==null?'на проверке':item.correct?'верно':'неверно'}`;list.append(li);}if(!entries.length){const li=document.createElement('li');li.textContent='Проверенных ответов пока нет.';list.append(li);}
}

document.querySelectorAll('[data-subject]').forEach(button=>button.addEventListener('click',()=>{location.hash=button.dataset.subject;}));
for(const [route,variant] of Object.entries(vprSubjects)){
 const row=document.createElement('li'),name=document.createElement('strong'),link=document.createElement('a');
 name.textContent=variant.theme;link.href='#'+route;link.textContent='Перейти';link.setAttribute('aria-label','Перейти · '+variant.theme);row.append(name,link);$('#variant-list ol').append(row);
}
window.addEventListener('hashchange',()=>{current=selectedWork();render();});
$('#reset').addEventListener('click',()=>{if(teacher||!ready||!confirm('Стереть ответы в этой домашней работе и начать заново?'))return;for(const task of subjects[current].tasks){if(shared){saved[task.id]={input:'',checked:false};sync.enqueue(task.id,'',false);}else delete saved[task.id];}store();render();if(shared)void sync.flush();});
if(shared){
 if(teacher){$('#page-title').textContent='Результаты ученика';$('#page-description').textContent='Ответы и история попыток. Обновление каждые 10 секунд.';$('#reset').hidden=true;$('.answer-help').hidden=true;$('#teacher-summary').hidden=false;$('#history-panel').hidden=false;$('#refresh-results').hidden=false;}
 sync=new ResultSync({baseUrl:SYNC_CONFIG.baseUrl,token:access.token,role:access.role,onChange(value){cloud=value;saved=value.answers;store();if(current==="vpr")return;if(teacher||!ready){render();return;}for(const task of subjects[current].tasks){const card=document.querySelector(`[data-task-id="${task.id}"]`),input=card?.querySelector('.answer-input');if(input){if(input.value!==state(task.id).input)input.value=state(task.id).input;renderState(card,task,state(task.id));}}updateProgress();},onStatus(value){
  $('#sync-panel').dataset.state=value;const messages={offline:'Нет связи. Ответы сохранены в браузере.',conflict:'Ответ изменён на другом устройстве. Твой ввод сохранён здесь. Можно явно заменить ответ на сервере.', 'invalid-link':'Время входа истекло. Выйди и войди с паролем ещё раз.','storage-error':'Браузер не смог сохранить копию. Не закрывай страницу до отправки.'};$('#sync-panel').hidden=!Object.hasOwn(messages,value);$('#sync-status').textContent=messages[value]||'';$('#sync-retry').hidden=teacher||!['offline','conflict'].includes(value);$('#sync-retry').textContent=value==='conflict'?'Отправить мой вариант':'Повторить';
 }});
 $('#sync-retry').addEventListener('click',()=>{if(sync.status==='conflict'){if(confirm('Заменить ответ на сервере твоим вариантом с этого устройства?'))void sync.flush({overwrite:true});}else void sync.refresh();});$('#refresh-results').addEventListener('click',()=>void sync.refresh());
 void sync.start().finally(()=>{ready=true;render();});
 window.addEventListener('online',()=>void sync.refresh());window.addEventListener('pagehide',()=>void sync.flush({keepalive:true}));document.addEventListener('visibilitychange',()=>{if(document.hidden)void sync.flush({keepalive:true});else void sync.refresh();});setInterval(()=>{if(!document.hidden)void sync.refresh();},10000);
 setBeforeLogout(()=>sync.flush());
}
render();
