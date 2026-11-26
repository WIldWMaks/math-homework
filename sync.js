export class ResultSync {
  constructor({baseUrl,token,role='student',storage=localStorage,fetcher=globalThis.fetch.bind(globalThis),onChange=()=>{},onStatus=()=>{}}){
    this.baseUrl=baseUrl.replace(/\/$/,'');this.token=token;this.role=role;this.storage=storage;this.fetcher=fetcher;this.onChange=onChange;this.onStatus=onStatus;this.status='loading';this.pending=[];this.remote={answers:{},history:[]};this.key='math-shared-v1-'+(token.slice(0,18)||'student');this.eventPrefix=this.key+'-event-';this.running=null;this.activeEvent=null;
    try{const cached=JSON.parse(storage.getItem(this.key)||'{}');if(cached.remote?.answers)this.remote=cached.remote;for(let i=0;i<storage.length;i++){const key=storage.key(i);if(!key?.startsWith(this.eventPrefix))continue;try{const e=JSON.parse(storage.getItem(key));if(/^[-_a-zA-Z0-9]{12,100}$/.test(e?.eventId)&&/^(?:[avtr](?:[1-9]|10)|[pf](?:[1-9]|1[0-2])|u(?:[1-9]|1[0-5])|g[1-7]|w(?:[1-9]|1[01])_(?:[1-9]|1[0-7]))$/.test(e?.taskId)&&typeof e.input==='string'&&e.input.length<=(e.taskId.startsWith("w")?2000:100)&&typeof e.checked==='boolean'&&Number.isSafeInteger(e.baseRevision)&&e.baseRevision>=0)this.pending.push(e);}catch{}}this.pending.sort((a,b)=>(a.order||0)-(b.order||0));}catch{}
    if(role==='teacher')this.pending=[];
  }
  setStatus(value){this.status=value;this.onStatus(value);}
  persist(){try{this.storage.setItem(this.key,JSON.stringify({remote:this.remote}));}catch{this.onStatus('storage-error');}}
  saveEvent(event){try{this.storage.setItem(this.eventPrefix+event.eventId,JSON.stringify(event));}catch{this.onStatus('storage-error');}}
  snapshot(){const answers={...this.remote.answers};for(const e of this.pending)answers[e.taskId]={...answers[e.taskId],input:e.input,checked:e.checked};return {...this.remote,answers};}
  emit(){this.persist();this.onChange(this.snapshot());}
  async request(path,options={}){const response=await this.fetcher(this.baseUrl+path,{...options,cache:'no-store',signal:AbortSignal.timeout(12000),headers:{...(this.token?{Authorization:'Bearer '+this.token}:{}),...(options.method?{'Content-Type':'application/json'}:{})}});let data;try{data=await response.json();}catch{throw new Error('unavailable');}if(!response.ok){const error=new Error(data?.error||'unavailable');error.status=response.status;error.state=data;throw error;}return data;}
  async start(){try{this.remote=await this.request('/api/state');this.emit();this.setStatus(this.pending.length?'pending':'saved');if(this.pending.length)await this.flush();}catch(error){this.emit();this.setStatus(error.status===401?'invalid-link':'offline');}return this.snapshot();}
  enqueue(taskId,input,checked){
    if(this.role!=='student')throw new Error('read-only');
    const tail=this.pending.findLast(e=>e.taskId===taskId);
    const event={eventId:crypto.randomUUID(),taskId,input,checked,baseRevision:tail?tail.baseRevision+1:(this.remote.answers[taskId]?.revision??0),order:Math.max(Date.now(),(this.pending.at(-1)?.order||0)+1)};this.pending.push(event);this.saveEvent(event);
    this.emit();if(this.status!=='conflict')this.setStatus('pending');
  }
  async flush({keepalive=false,overwrite=false}={}){
    if(this.role==='teacher'||this.status==='conflict'&&!overwrite)return;
    if(this.running)return this.running;
    this.running=(async()=>{
      if(overwrite){try{this.remote=await this.request('/api/state');}catch{this.setStatus('offline');return;}}
      while(this.pending.length){const event=this.pending[0];if(overwrite)event.baseRevision=this.remote.answers[event.taskId]?.revision??0;this.saveEvent(event);this.activeEvent=event.eventId;this.setStatus('saving');
        try{const response=await this.request('/api/change',{method:'POST',body:JSON.stringify(event),keepalive});this.remote=response;this.pending.shift();try{this.storage.removeItem(this.eventPrefix+event.eventId);}catch{}this.activeEvent=null;this.emit();}
        catch(error){this.activeEvent=null;if(error.status===409){this.remote=error.state;this.emit();this.setStatus('conflict');}else this.setStatus(error.status===401?'invalid-link':'offline');return;}
      }this.setStatus('saved');
    })();try{return await this.running;}finally{this.running=null;}
  }
  async refresh(){if(this.pending.length)return this.flush();if(this.running)return;try{this.remote=await this.request('/api/state');this.emit();this.setStatus('saved');}catch(error){this.setStatus(error.status===401?'invalid-link':'offline');}}
}
