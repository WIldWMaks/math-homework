/*
 * All original PDF URLs were fetched and matched byte-for-byte (SHA-256)
 * against Материалы on 2026-11-21. The duplicate ВПР Skysmart folder is not
 * a separate collection. We link originals rather than republishing files:
 * https://legal.skysmart.ru/doc/view/terms_of_use_SKM_ANO_rus
 * Official 2027 PDF SHA-256:
 * c3d23078499e7a81c947b3d67a432d9ce90ad10b60af94a68c679e0aff9b1b27
 * Its printed page numbers restart. Below, page numbers are PDF positions.
 */
const skysmartFiles='https://skysmart.ru/vpr/files/';
const officialSource='https://fioco.ru/obraztsi_i_opisaniya_vpr';
const officialPdf='https://fioco.ru/Media/Default/Documents/%D0%92%D0%9F%D0%A0_2027/VPR_MA-7_DEMO_%28B%29_2027.pdf';

function skysmartVariant(set,variant){
 let tasks,answers;
 if(set<=3){
  tasks=`vpr-po-matematike-za-7-klass-komplekt-${set}-variant-${variant}.pdf`;
  answers=`otvety-na-zadaniya-vpr-po-matematike-za-7-klass-komplekt-${set}-variant-${variant}.pdf`;
 }else if(set===4){
  tasks=`zadaniya-dlya-vpr-po-matematike-za-7-klass-komplekt-4-variant-${variant}.pdf`;
  answers=`otvety-na-vpr-za-7-klass-predmet-matematika-komplekt-4-variant-${variant}.pdf`;
 }else{
  tasks=variant===1?'ВПР по математике для 7 класса. Комплект 5, вариант 1.pdf':'ВПР по математике за 7 класс. Комплект 5, вариант 2.pdf';
  answers=variant===1?'Ответы ВПР по математике для 7 класса. Комплект 5, вариант 1.pdf':'Ответы на ВПР по математике за 7 класс. Комплект 5, вариант 2.pdf';
 }
 return Object.freeze({
  number:(set-1)*2+variant,
  title:`Комплект ${set} · Вариант ${variant}`,
  publisher:'Skysmart',
  description:'16 заданий · 90 минут',
  tasksUrl:skysmartFiles+encodeURIComponent(tasks),
  answersUrl:skysmartFiles+encodeURIComponent(answers),
  sourceUrl:`https://skysmart.ru/vpr/${set===5?'zadanie-vpr-po-matematike-za-7-klass':'zadaniya-vpr-po-matematike-za-7-klass-s-otvetami'}-komplekt-${set}-variant-${variant}`,
  official:false
 });
}

export const vprArchive=Object.freeze([
 ...Array.from({length:5},(_,i)=>[skysmartVariant(i+1,1),skysmartVariant(i+1,2)]).flat(),
 Object.freeze({number:11,title:'Образец 2027 · Базовый уровень',publisher:'ФИОКО',description:'17 заданий · 2 урока до 45 минут',tasksUrl:officialPdf+'#page=1',answersUrl:officialPdf+'#page=14',sourceUrl:officialSource,official:true})
]);

function element(tag,className,text){
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(text)node.textContent=text;
 return node;
}

function externalLink(url,text,className,label){
 const link=element('a',className,text);
 link.href=url;link.target='_blank';link.rel='noopener noreferrer';
 link.setAttribute('aria-label',`${label||text}, в новой вкладке`);
 return link;
}

/**
 * Dashboard contract:
 * renderVprArchive({teacher, visible: current === 'vpr'}).
 * Call on initial render and subject/role changes. No state/storage requests.
 * Collapsed/open state is preserved during subsequent same-role renders.
 * Answers are a teacher-only convenience, not an access control boundary:
 * the publisher's original materials are publicly accessible.
 */
export function renderVprArchive({teacher=false,visible=true,container=document.querySelector('#vpr-archive')}={}){
 if(!container)return;
 container.hidden=!visible;
 const role=teacher?'teacher':'student';
 if(container.dataset.archiveRole===role)return;
 const wasOpen=container.querySelector('details')?.open||false;
 container.dataset.archiveRole=role;
 container.classList.add('vpr-archive');
 container.setAttribute('aria-labelledby','vpr-archive-title');
 const details=element('details','archive-details');details.open=wasOpen;
 const summary=element('summary','archive-summary');
 const heading=element('h2',null,'Архив ВПР');heading.id='vpr-archive-title';
 summary.append(heading,element('span','archive-count','11 вариантов'));
 details.append(summary);
 const body=element('div','archive-body');
 body.append(element('p','archive-intro',teacher?'Задания и ответы открываются отдельно. Номера 1–10 - комплекты Skysmart, № 11 - официальный образец ФИОКО 2027.':'Выбери вариант и решай в тетради. Задания откроются в PDF на сайте источника. Стартовую работу с проверкой ответов можно решить выше.'));
 const list=element('ol','archive-list');
 for(const item of vprArchive){
  const row=element('li','archive-variant');row.dataset.archiveVariant=String(item.number);
  const top=element('div','archive-variant-head');
  const labels=element('div','archive-labels');
  labels.append(element('h3',null,`Вариант ${item.number}`));
  top.append(labels);row.append(top);
  row.append(element('p','archive-meta',item.description));
  const actions=element('div','archive-actions');
  actions.append(externalLink(item.tasksUrl,'Задания · PDF','archive-task-link',`Задания варианта ${item.number}, PDF`));
  if(teacher)actions.append(externalLink(item.answersUrl,'Ответы · PDF','archive-answer-link',`Ответы варианта ${item.number}, PDF`));
  row.append(actions);
  if(item.official)row.append(element('p','archive-file-note',teacher?'Один официальный PDF: задания на страницах 1–13, ответы и критерии на страницах 14–19. Ссылки открывают нужную часть.':'Решай страницы 1–13. В конце этого PDF, начиная со страницы 14, находятся ответы и критерии.'));
  const source=element('p','archive-source');
  source.append(externalLink(item.sourceUrl,`Источник: ${item.publisher}`,null,`Страница источника варианта ${item.number}: ${item.publisher}`));row.append(source);
  list.append(row);
 }
 body.append(list,element('p','archive-footnote','Варианты Skysmart опубликованы в 2021 году и подходят для тренировки. Актуальный формат смотри в образце 2027. Проверка ответов на сайте доступна в стартовой работе.'));
 details.append(body);container.replaceChildren(details);
}
