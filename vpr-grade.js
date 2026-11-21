// Shared deterministic grading. Manual/graphical tasks deliberately return null.
function text(value){return String(value??'').normalize('NFKC').toLowerCase().replace(/[−–—]/g,'-').replace(/ё/g,'е').trim();}
function number(value){
 let s=text(value).replace(/\u00a0/g,' ').replace(/,/g,'.').replace(/\s*(?:км\/ч|м\/с|мм|км|см|кг|руб(?:лей|ля|ль|\.)?|тонн(?:ы|а)?|г|м|°|%|мин(?:ут(?:ы|а)?)?)\s*$/u,'').trim();
 const num='[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)';
 const mixed=s.match(/^([+-]?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
 if(mixed){const [,sign,w,n,d]=mixed;if(Number(d)===0||Number(n)>=Number(d))return null;return (Number(w)+Number(n)/Number(d))*(sign==='-'?-1:1);}
 // Spaces between digits are allowed as thousands separators, never as an answer list.
 if(/^[+-]?\d{1,3}(?: \d{3})+(?:\.\d+)?$/.test(s))s=s.replace(/ /g,'');
 if(new RegExp('^'+num+'$').test(s)){const n=Number(s);return Number.isFinite(n)?n:null;}
 const f=s.match(new RegExp('^('+num+')\\s*/\\s*('+num+')$'));if(!f||Number(f[2])===0)return null;
 const n=Number(f[1])/Number(f[2]);return Number.isFinite(n)?n:null;
}
function norm(value){return text(value).replace(/\s+/g,'').replace(/[.,;]+$/,'');}
function formula(value){
 const s=norm(value).replace(/,/g,'.').replace(/х/g,'x').replace(/у/g,'y').replace(/^f\(x\)=|^y=/,'');
 if(!s||s.includes('**')||!/^[0-9.x+*/-]+$/.test(s))return null;
 const terms=s.match(/[+-]?[^+-]+/g);if(!terms||terms.join('')!==s)return null;
 let coefficient=0,constant=0;
 for(let term of terms){let sign=1;if(term[0]==='-'){sign=-1;term=term.slice(1);}else if(term[0]==='+')term=term.slice(1);
  if(!term.includes('x')){const n=number(term);if(n===null)return null;constant+=sign*n;continue;}
  const left=term.match(/^(.+?)\*?x$/),right=term.match(/^x\*(.+)$/),division=term.match(/^x\/(.+)$/);
  let n;if(term==='x')n=1;else if(left)n=number(left[1]);else if(right)n=number(right[1]);else if(division){const d=number(division[1]);n=d?1/d:null;}else return null;
  if(n===null||!Number.isFinite(n))return null;coefficient+=sign*n;
 }return [coefficient,constant];
}
function choices(value){const s=text(value).replace(/и/g,'').replace(/[\s,;]+/g,'');return /^\d+$/.test(s)?[...s].sort().join(''):null;}
function equivalent(value,answer){const a=number(value),b=number(answer);return a!==null&&b!==null?Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(b)):norm(value)===norm(answer);}
export function gradeVpr(input,key){
 if(!key||key.manual)return null;
 if(Array.isArray(key.parts)){
  const values=Array.isArray(input)?input:String(input??'').split(/[;\n]+/).map(s=>s.trim());
  if(values.length!==key.parts.length)return false;
  const results=key.parts.map((part,i)=>gradeVpr(values[i],part));return results.includes(false)?false:results.includes(null)?null:true;
 }
 if(Array.isArray(key.range)){const n=number(input);return n!==null&&n>=key.range[0]&&n<=key.range[1];}
 if(!Array.isArray(key.answers))return null;
 if(key.set){const value=choices(input);return value!==null&&key.answers.some(a=>value===choices(a));}
 if(key.kind==='formula'){const value=formula(input);return value!==null&&key.answers.some(a=>{const expected=formula(a);return expected!==null&&value.every((n,i)=>Math.abs(n-expected[i])<=1e-9*Math.max(1,Math.abs(expected[i])));});}
 return key.answers.some(a=>equivalent(input,a));
}
