const f = (n, d) => `<mfrac><mn>${n}</mn><mn>${d}</mn></mfrac>`;
const math = body => `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><mrow>${body}</mrow></math>`;
const op = symbol => `<mo>${symbol}</mo>`;
const n = number => `<mn>${number}</mn>`;
export const subjects = {
  algebra: {
    name: 'Алгебра', theme: 'Дроби и порядок действий', time: '15–25 минут',
    tasks: [
      { id:'a1', math:math(op('−')+f(5,6)+op('+')+f(1,4)), accessible:'Минус пять шестых плюс одна четверть', answer:[-7,12] },
      { id:'a2', math:math(f(7,9)+op('·')+f(3,14)), accessible:'Семь девятых умножить на три четырнадцатых', answer:[1,6] },
      { id:'a3', math:math(f(3,5)+op(':')+f(9,10)), accessible:'Три пятых разделить на девять десятых', answer:[2,3] },
      { id:'a4', math:math(op('(')+n('1,2')+op('−')+f(3,4)+op(')')+op('·')+f(2,3)), accessible:'Одна целая две десятых минус три четверти, результат умножить на две трети', answer:[3,10] },
      { id:'a5', math:math(op('−')+f(7,8)+op('+')+f(1,2)), accessible:'Минус семь восьмых плюс одна вторая', answer:[-3,8] },
      { id:'a6', math:math(f(2,3)+op('+')+f(5,12)), accessible:'Две трети плюс пять двенадцатых', answer:[13,12] },
      { id:'a7', math:math(f(4,7)+op('·')+op('(')+op('−')+f(21,8)+op(')')), accessible:'Четыре седьмых умножить на минус двадцать одну восьмую', answer:[-3,2] },
      { id:'a8', math:math(op('(')+f(3,4)+op('−')+f(1,2)+op(')')+op(':')+f(5,6)), accessible:'Из трёх четвертей вычесть одну вторую, результат разделить на пять шестых', answer:[3,10] },
      { id:'a9', math:math(n(1)+op('−')+f(3,4)+op(':')+f(1,2)), accessible:'Один минус три четверти разделить на одну вторую', answer:[-1,2] },
      { id:'a10', math:math(op('(')+op('−')+f(2,3)+op('+')+f(5,6)+op(')')+op('·')+n(12)), accessible:'Минус две трети плюс пять шестых, результат умножить на двенадцать', answer:[2,1] },
    ],
  },
  geometry: {
    name:'Геометрия', theme:'Отрезки и углы', time:'15–25 минут',
    tasks:[
      { id:'g1', prompt:'Точка C лежит между A и B. AB = 9 см, AC = 4 см. Найди CB.', diagram:'segment-acb', unit:'см', answer:[5,1] },
      { id:'g2', prompt:'Луч OC проходит внутри угла AOB. ∠AOB = 130°, ∠AOC = 55°. Найди ∠COB.', diagram:'angle-130', unit:'°', answer:[75,1] },
      { id:'g3', prompt:'Точка B лежит между A и C. AB = 3,6 см, BC = 2,4 см. Найди AC.', diagram:'segment-abc', unit:'см', answer:[6,1] },
      { id:'g4', prompt:'Луч OC проходит внутри угла AOB. ∠AOC = 32°, ∠COB = 48°. Найди ∠AOB.', diagram:'angle-80', unit:'°', answer:[80,1] },
      { id:'g5', prompt:'M — середина отрезка AB. AB = 14 см. Найди AM.', diagram:'segment-mid', unit:'см', answer:[7,1] },
      { id:'g6', prompt:'Угол AOB развёрнутый. Луч OC делит его на два угла. ∠AOC = 65°. Найди ∠COB.', diagram:'angle-180', unit:'°', answer:[115,1] },
      { id:'g7', prompt:'Точка B лежит между A и C. AC = 12,5 см, AB = 4,8 см. Найди BC.', diagram:'segment-abc', unit:'см', answer:[77,10] },
    ],
  },
};

export function diagramSVG(type) {
  const start='<svg viewBox="0 0 400 190" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Чертёж к условию задачи"><g fill="none" stroke="#292929" stroke-width="3" stroke-linecap="round">';
  const text=(x,y,label,color='#292929')=>`<text x="${x}" y="${y}" fill="${color}" font-family="Arial,sans-serif" font-size="19" text-anchor="middle">${label}</text>`;
  const point=(x,y,label)=>`<circle cx="${x}" cy="${y}" r="4" fill="#292929"/>${text(x,y+30,label)}`;
  if(type.startsWith('segment')) {
    const labels=type==='segment-acb'?['A','C','B']:type==='segment-mid'?['A','M','B']:['A','B','C'];
    return start+'<path d="M35 85H365"/></g>'+[35,180,365].map((x,i)=>point(x,85,labels[i])).join('')+(type==='segment-mid'?'<g stroke="#FD612D" stroke-width="3"><path d="M100 77L107 93M265 77L272 93"/></g>':'')+'</svg>';
  }
  const angles={ 'angle-130':[130,55], 'angle-80':[80,32], 'angle-180':[180,65] };
  const [outer,inner]=angles[type]??[80,35];
  const ox=180,oy=145,length=115;
  const pt=a=>[ox+length*Math.cos(a*Math.PI/180),oy-length*Math.sin(a*Math.PI/180)];
  const A=pt(0),B=pt(outer),C=pt(inner);
  return start+`<path d="M${B[0]} ${B[1]}L${ox} ${oy}L${A[0]} ${A[1]}"/><path stroke="#FD612D" d="M${ox} ${oy}L${C[0]} ${C[1]}"/></g>`+point(ox,oy,'O')+text(A[0]+13,A[1]+6,'A')+text(B[0]-9,B[1]-9,'B')+text(C[0]+13,C[1]-7,'C','#FD612D')+'</svg>';
}
