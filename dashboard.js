import {subjects,diagramSVG} from './tasks.js';
import {parseAnswer,isCorrect} from './checker.js';
import {ResultSync} from './sync.js';
import {readAccount,setBeforeLogout} from './account.js';
import {SYNC_CONFIG} from './sync-config.js';
const access=readAccount(),shared=Boolean(SYNC_CONFIG.enabled&&access),teacher=shared&&access.role==='teacher';
const storageKey=shared?'math-view-v1-'+(access.token.slice(0,18)||'student'):'math-homework-v1';
let sync,cloud={answers:{},history:[]},ready=!shared,saveTimer;
let saved={};
try {const value=JSON.parse(localStorage.getItem(storageKey)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))saved=value;}catch{}
let current=location.hash==='#vpr'?'vpr':location.hash==='#geometry'?'geometry':'algebra';
const $=selector=>document.querySelector(selector);
function store(){try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{}}
function state(id){const item=saved[id];return item&&typeof item.input==='string'?item:{input:'',checked:false};}
function queue(id,input,checked){if(!shared)return;sync.enqueue(id,input,checked);clearTimeout(saveTimer);if(checked)void sync.flush();else saveTimer=setTimeout(()=>void sync.flush(),600);}
function formatDate(value){return value?new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'';}
function updateProgress(){const tasks=subjects[current].tasks;const correct=tasks.filter(task=>state(task.id).checked&&isCorrect(state(task.id).input,task.answer)).length;$('#progress-text').textContent=`${correct} из ${tasks.length} решено`;$('#progress').max=tasks.length;$('#progress').value=correct;$('#completion').hidden=correct!==tasks.length;}
function renderState(card,task,item){
 card.classList.remove('checked-correct','checked-wrong');const feedback=card.querySelector('.feedback'),status=card.querySelector('.task-status');feedback.textContent='';status.textContent='';
 card.querySelector('input').removeAttribute('aria-invalid');
 if(!item.checked)return;
 if(parseAnswer(item.input)===null){feedback.textContent='Введи число или дробь, например 3/4.';card.querySelector('input').setAttribute('aria-invalid','true');return;}
 if(isCorrect(item.input,task.answer)){card.classList.add('checked-correct');feedback.textContent='Верно. Можно переходить дальше.';status.textContent='✓';}
 else {card.classList.add('checked-wrong');feedback.textContent='Пока неверно. Проверь решение и попробуй ещё раз.';card.querySelector('input').setAttribute('aria-invalid','true');}
}
function render(){
 const subject=subjects[current];const diagnostic=current==='vpr';document.querySelector('#vpr-archive').hidden=!(teacher && diagnostic);document.title=diagnostic?'ВПР · Стартовая работа':subject.name+' · Домашняя № 1';document.querySelector('.homeworks').hidden=diagnostic;document.querySelector('.workspace').classList.toggle('diagnostic',diagnostic);
 document.querySelectorAll('[data-subject]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.subject===current)));
 $('#task-meta').textContent=`${diagnostic ? "Авторская диагностика · Решай без калькулятора" : "Домашняя № 1"} · ${subject.tasks.length} заданий · ${subject.time}`;$('#assignment-title').textContent=subject.theme;
 const container=$('#tasks');container.replaceChildren();
 subject.tasks.forEach((task,index)=>{
  const card=document.createElement('article');card.className='task';card.dataset.taskId=task.id;
  const head=document.createElement('div');head.className='task-number';head.innerHTML=`<span>Задание ${index+1}</span><span class="task-status" aria-hidden="true"></span>`;card.append(head);
  if(task.math){const expression=document.createElement('div');expression.className='expression';expression.setAttribute('role','math');expression.setAttribute('aria-label',task.accessible);expression.innerHTML=task.math;expression.querySelector('math').setAttribute('aria-hidden','true');card.append(expression);}
  if(task.prompt){const prompt=document.createElement('p');prompt.className='task-prompt';prompt.textContent=task.prompt;card.append(prompt);}
  if(task.diagram){const diagram=document.createElement('div');diagram.className='diagram';diagram.innerHTML=diagramSVG(task.diagram);card.append(diagram);}
  if(teacher){
   const item=state(task.id),answer=document.createElement('p');answer.className='teacher-answer';answer.textContent=item.input?'Ответ: '+item.input:'Ответа пока нет';card.append(answer);
   const status=document.createElement('p');status.className='teacher-state';status.textContent=item.checked?(item.correct?'Верно':'Неверно'):(item.input?'Не проверен':'Не начато');if(item.checked&&!item.correct)status.classList.add('wrong');card.append(status);
   const detail=document.createElement('p');detail.className='teacher-detail';detail.textContent=`Попыток: ${item.attempts||0} · Ошибочных: ${item.wrongCount||0}`+(item.updatedAt?' · '+formatDate(item.updatedAt):'');card.append(detail);container.append(card);return;
  }
  const form=document.createElement('form');form.className='answer-form';form.noValidate=true;
  const wrapper=document.createElement('div');wrapper.className='input-wrap';const input=document.createElement('input');input.className='answer-input';input.type='text';input.inputMode='text';input.autocomplete='off';input.spellcheck=false;input.maxLength=100;input.placeholder='Ответ';input.setAttribute('aria-label',`Ответ на задание ${index+1}`);input.setAttribute('aria-describedby',`feedback-${task.id}`);input.value=state(task.id).input;wrapper.append(input);
  if(task.unit){const unit=document.createElement('span');unit.className='input-unit';unit.textContent=task.unit;unit.setAttribute('aria-hidden','true');wrapper.append(unit);}
  const button=document.createElement('button');button.type='submit';button.className='check';button.textContent='Проверить';input.disabled=!ready;button.disabled=!ready;form.append(wrapper,button);card.append(form);
  const feedback=document.createElement('p');feedback.className='feedback';feedback.id=`feedback-${task.id}`;feedback.setAttribute('aria-live','polite');card.append(feedback);
  input.addEventListener('input',()=>{saved[task.id]={input:input.value,checked:false};renderState(card,task,saved[task.id]);updateProgress();store();queue(task.id,input.value,false);});
  form.addEventListener('submit',event=>{event.preventDefault();saved[task.id]={input:input.value,checked:true};renderState(card,task,saved[task.id]);updateProgress();store();queue(task.id,input.value,true);});
  renderState(card,task,state(task.id));container.append(card);
 });updateProgress();if(teacher)renderTeacherSummary();
}
function renderTeacherSummary(){
 const tasks=subjects[current].tasks,wrong=tasks.filter(t=>state(t.id).checked&&!state(t.id).correct).length,unverified=tasks.filter(t=>!state(t.id).checked).length;$('#teacher-summary').textContent=`Неверных: ${wrong} · Ещё не проверено: ${unverified}`;
 const list=$('#attempt-history');list.replaceChildren();const entries=(cloud.history||[]).filter(e=>tasks.some(t=>t.id===e.taskId)).slice(0,20);for(const item of entries){const li=document.createElement('li');li.textContent=`${formatDate(item.at)} · Задание ${tasks.findIndex(t=>t.id===item.taskId)+1} · Ответ: ${item.input||'пусто'} · ${item.correct?'верно':'неверно'}`;list.append(li);}if(!entries.length){const li=document.createElement('li');li.textContent='Проверенных ответов пока нет.';list.append(li);}
}
function subjectHash(){return '#'+current;}
document.querySelectorAll('[data-subject]').forEach(button=>button.addEventListener('click',()=>{current=button.dataset.subject;history.replaceState(null,'',subjectHash());render();}));
window.addEventListener('hashchange',()=>{current=location.hash==='#vpr'?'vpr':location.hash==='#geometry'?'geometry':'algebra';render();});
$('#reset').addEventListener('click',()=>{if(teacher||!ready||!confirm('Стереть ответы в этой домашней работе и начать заново?'))return;for(const task of subjects[current].tasks){if(shared){saved[task.id]={input:'',checked:false};sync.enqueue(task.id,'',false);}else delete saved[task.id];}store();render();if(shared)void sync.flush();});
if(shared){
 $('#sync-panel').hidden=false;$('.save-note').textContent=teacher?'Ответы ученика обновляются автоматически.':'Ответы сохраняются онлайн.';
 if(teacher){$('#page-title').textContent='Результаты ученика';$('#page-description').textContent='Ответы и история попыток. Обновление каждые 10 секунд.';$('#reset').hidden=true;$('.answer-help').hidden=true;$('#teacher-summary').hidden=false;$('#history-panel').hidden=false;$('#refresh-results').hidden=false;}
 sync=new ResultSync({baseUrl:SYNC_CONFIG.baseUrl,token:access.token,role:access.role,onChange(value){cloud=value;saved=value.answers;store();if(teacher||!ready){render();return;}for(const task of subjects[current].tasks){const card=document.querySelector(`[data-task-id="${task.id}"]`),input=card?.querySelector('input');if(input){if(input.value!==state(task.id).input)input.value=state(task.id).input;renderState(card,task,state(task.id));}}updateProgress();},onStatus(value){
  $('#sync-panel').dataset.state=value;const messages={loading:'Загружаем сохранённые ответы…',pending:'Сохраняем ответы…',saving:'Сохраняем ответы…',saved:teacher?'Результаты обновлены.':'Все изменения сохранены онлайн.',offline:'Нет связи. Ответы сохранены в браузере.',conflict:'Ответ изменён на другом устройстве. Твой ввод сохранён здесь. Можно явно заменить ответ на сервере.', 'invalid-link':'Время входа истекло. Выйди и войди с паролем ещё раз.','storage-error':'Браузер не смог сохранить копию. Не закрывай страницу до отправки.'};$('#sync-status').textContent=messages[value]||value;$('#sync-retry').hidden=teacher||!['offline','conflict'].includes(value);$('#sync-retry').textContent=value==='conflict'?'Отправить мой вариант':'Повторить';
 }});
 $('#sync-retry').addEventListener('click',()=>{if(sync.status==='conflict'){if(confirm('Заменить ответ на сервере твоим вариантом с этого устройства?'))void sync.flush({overwrite:true});}else void sync.refresh();});$('#refresh-results').addEventListener('click',()=>void sync.refresh());
 void sync.start().finally(()=>{ready=true;render();});
 window.addEventListener('online',()=>void sync.refresh());window.addEventListener('pagehide',()=>void sync.flush({keepalive:true}));document.addEventListener('visibilitychange',()=>{if(document.hidden)void sync.flush({keepalive:true});else void sync.refresh();});setInterval(()=>{if(!document.hidden)void sync.refresh();},10000);
 setBeforeLogout(()=>sync.flush());
}else{$('#sync-panel').hidden=false;$('#sync-status').textContent='Общее сохранение ещё не включено. Пока ответы сохраняются только в этом браузере.';}
render();
