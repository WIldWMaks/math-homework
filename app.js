import {subjects,diagramSVG} from './tasks.js';
import {parseAnswer,isCorrect} from './checker.js';
const storageKey='math-homework-v1';
let saved={};
try {const value=JSON.parse(localStorage.getItem(storageKey)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))saved=value;}catch{}
let current=location.hash==='#geometry'?'geometry':'algebra';
const $=selector=>document.querySelector(selector);
function store(){try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{}}
function state(id){const item=saved[id];return item&&typeof item.input==='string'?item:{input:'',checked:false};}
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
 const subject=subjects[current];document.title=`${subject.name} — домашняя № 1`;
 document.querySelectorAll('[data-subject]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.subject===current)));
 $('#task-meta').textContent=`Домашняя № 1 · ${subject.tasks.length} заданий · ${subject.time}`;$('#assignment-title').textContent=subject.theme;
 const container=$('#tasks');container.replaceChildren();
 subject.tasks.forEach((task,index)=>{
  const card=document.createElement('article');card.className='task';card.dataset.taskId=task.id;
  const head=document.createElement('div');head.className='task-number';head.innerHTML=`<span>Задание ${index+1}</span><span class="task-status" aria-hidden="true"></span>`;card.append(head);
  if(task.math){const expression=document.createElement('div');expression.className='expression';expression.setAttribute('role','math');expression.setAttribute('aria-label',task.accessible);expression.innerHTML=task.math;expression.querySelector('math').setAttribute('aria-hidden','true');card.append(expression);}
  if(task.prompt){const prompt=document.createElement('p');prompt.className='task-prompt';prompt.textContent=task.prompt;card.append(prompt);}
  if(task.diagram){const diagram=document.createElement('div');diagram.className='diagram';diagram.innerHTML=diagramSVG(task.diagram);card.append(diagram);}
  const form=document.createElement('form');form.className='answer-form';form.noValidate=true;
  const wrapper=document.createElement('div');wrapper.className='input-wrap';const input=document.createElement('input');input.className='answer-input';input.type='text';input.inputMode='text';input.autocomplete='off';input.spellcheck=false;input.maxLength=100;input.placeholder='Ответ';input.setAttribute('aria-label',`Ответ на задание ${index+1}`);input.setAttribute('aria-describedby',`feedback-${task.id}`);input.value=state(task.id).input;wrapper.append(input);
  if(task.unit){const unit=document.createElement('span');unit.className='input-unit';unit.textContent=task.unit;unit.setAttribute('aria-hidden','true');wrapper.append(unit);}
  const button=document.createElement('button');button.type='submit';button.className='check';button.textContent='Проверить';form.append(wrapper,button);card.append(form);
  const feedback=document.createElement('p');feedback.className='feedback';feedback.id=`feedback-${task.id}`;feedback.setAttribute('aria-live','polite');card.append(feedback);
  input.addEventListener('input',()=>{saved[task.id]={input:input.value,checked:false};renderState(card,task,saved[task.id]);updateProgress();store();});
  form.addEventListener('submit',event=>{event.preventDefault();saved[task.id]={input:input.value,checked:true};renderState(card,task,saved[task.id]);updateProgress();store();});
  renderState(card,task,state(task.id));container.append(card);
 });updateProgress();
}
document.querySelectorAll('[data-subject]').forEach(button=>button.addEventListener('click',()=>{current=button.dataset.subject;history.replaceState(null,'',`#${current}`);render();}));
window.addEventListener('hashchange',()=>{current=location.hash==='#geometry'?'geometry':'algebra';render();});
$('#reset').addEventListener('click',()=>{if(!confirm('Стереть ответы в этой домашней работе и начать заново?'))return;for(const task of subjects[current].tasks)delete saved[task.id];store();render();});
render();
