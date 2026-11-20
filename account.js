import {SYNC_CONFIG} from './sync-config.js';
const key='math-account-v1';
let beforeLogout=async()=>{};
export function setBeforeLogout(callback){beforeLogout=callback;}
export function readAccount(storage=localStorage){try{const value=JSON.parse(storage.getItem(key)||'null');if(value?.role==='student')return {role:'student',token:''};if(value?.role==='teacher'&&/^[a-f0-9]{64}$/.test(value.token)&&Number.isFinite(value.expiresAt)&&value.expiresAt>Date.now())return value;}catch{}return null;}
export async function authenticate(baseUrl,password,fetcher=globalThis.fetch.bind(globalThis)){
 const response=await fetcher(baseUrl+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password}),signal:AbortSignal.timeout(12000)});
 let data;try{data=await response.json();}catch{throw new Error('Нет связи с сервером. Попробуй ещё раз.');}
 if(!response.ok)throw new Error(response.status===401?'Пароль не подходит.':response.status===429?'Слишком много попыток. Попробуй через 10 минут.':'Нет связи с сервером. Попробуй ещё раз.');
 if(!/^[a-f0-9]{64}$/.test(data.token)||!Number.isFinite(data.expiresAt)||data.expiresAt<=Date.now())throw new Error('Не удалось войти. Попробуй ещё раз.');
 return {role:'teacher',token:data.token,expiresAt:data.expiresAt};
}
export function setupAccount(){
 const account=readAccount(),panel=document.querySelector('#account-panel'),main=document.querySelector('#learning'),logout=document.querySelector('#logout'),error=document.querySelector('#login-error');
 panel.hidden=Boolean(account);main.hidden=!account;logout.hidden=!account;
 if(account){document.querySelector('#account-name').textContent=account.role==='teacher'?'Администратор':'Ученик';logout.addEventListener('click',async()=>{logout.disabled=true;await beforeLogout();if(account.role==='teacher'){
   try{await fetch(SYNC_CONFIG.baseUrl+'/api/logout',{method:'POST',headers:{Authorization:'Bearer '+account.token},signal:AbortSignal.timeout(12000)});}catch{}
   try{localStorage.removeItem('math-shared-v1-'+account.token.slice(0,18));localStorage.removeItem('math-view-v1-'+account.token.slice(0,18));}catch{}
  }try{localStorage.removeItem(key);}catch{}location.hash='algebra';location.reload();});return account;}
 const save=value=>{try{localStorage.setItem(key,JSON.stringify(value));location.reload();}catch{error.textContent='Разреши браузеру сохранять данные сайта, чтобы войти.';}};
 document.querySelector('#student-entry').addEventListener('click',()=>save({role:'student',token:''}));
 document.querySelector('#teacher-entry').addEventListener('click',()=>{document.querySelector('#admin-login').hidden=false;document.querySelector('#admin-password').focus();});
 document.querySelector('#admin-login').addEventListener('submit',async event=>{event.preventDefault();const button=document.querySelector('#admin-submit'),password=document.querySelector('#admin-password');error.textContent='';button.disabled=true;button.textContent='Входим…';try{if(!SYNC_CONFIG.enabled)throw new Error('Онлайн-вход ещё подключается.');const account=await authenticate(SYNC_CONFIG.baseUrl,password.value);password.value='';save(account);}catch(e){error.textContent=e.name==='TimeoutError'||e instanceof TypeError?'Нет связи с сервером. Попробуй ещё раз.':e.message;password.value='';password.focus();}finally{button.disabled=false;button.textContent='Войти';}});
 return null;
}
