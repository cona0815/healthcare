export interface PendingChange { id: string; destination: string; key: string; payload: any; createdAt: string; attempts: number; error?: string; conflict?: boolean; current?: any; }
export class SyncQueue {
  busy = false;
  constructor(private storage: Storage, private send: (payload: any, destination: string)=>Promise<any>, private notify: ()=>void = ()=>{}) {}
  list(): PendingChange[] { return JSON.parse(this.storage.getItem('hg_sync_queue_v1') || '[]'); }
  private write(rows: PendingChange[]) { this.storage.setItem('hg_sync_queue_v1', JSON.stringify(rows)); this.notify(); }
  enqueue(destination: string, key: string, payload: any) {
    const previous=this.list().find(r=>r.destination===destination&&r.key===key);
    if(payload.type==='FoodLogs'&&previous)payload={...payload,baseRevision:previous.payload.baseRevision??Math.max(0,(previous.payload.data?.revision||1)-1)};
    const item = {id:crypto.randomUUID(),destination,key,payload,createdAt:new Date().toISOString(),attempts:0};
    this.write([...this.list().filter(row=>!(row.destination===destination&&row.key===key)),item]);
  }
  replaceConflict(id:string,payload:any){const rows=this.list();if(!rows.some(r=>r.id===id&&r.conflict))throw new Error('衝突狀態已變更，請重新開啟');this.write(rows.map(r=>r.id===id?{...r,id:crypto.randomUUID(),payload,conflict:false,current:undefined,error:undefined,attempts:0}:r));}
  remove(id:string){this.write(this.list().filter(r=>r.id!==id));}
  async flush(destination: string, includeUnassigned=false) {
    if(this.busy || !destination) return;
    this.busy=true; this.notify();
    try {
      this.write(this.list().map(r=>r.payload.type==='FoodLogs'&&!r.payload.operationId?{...r,payload:{...r.payload,action:'save_meal_v3',operationId:r.id,baseRevision:Math.max(0,(r.payload.data?.revision||1)-1)}}:r));
      if(includeUnassigned) this.write(this.list().map(r=>r.destination?r:{...r,destination}));
      for(const row of this.list().filter(r=>r.destination===destination)) {
        // A newer edit can replace an item while another request is in flight.
        if(!this.list().some(r=>r.id===row.id)) continue;
        try {
          if(row.conflict) continue;
          const response=await this.send(row.payload,destination);
          if(response?.status==='conflict'||response?.ignoredStale){this.write(this.list().map(r=>r.id===row.id?{...r,conflict:true,current:response.current,error:response.message||'餐點版本衝突，雲端未接受本次變更'}:r));continue;}
          if(row.payload.type==='FoodLogs'&&(response?.protocol!==3||response?.operationId!==row.payload.operationId))throw new Error('GAS 版本過舊或缺少確認碼；請部署設定內的 v3 程式後重試。本機紀錄仍保留。');
          if(response?.status!=='success' && !(row.payload.action==='delete' && response?.status==='deleted')) throw new Error(response?.message || '雲端未確認儲存成功');
          this.write(this.list().filter(r=>r.id!==row.id).map(r=>r.key===row.key&&r.destination===row.destination&&r.payload.type==='FoodLogs'?{...r,payload:{...r.payload,baseRevision:row.payload.data.revision}}:r));
          this.storage.setItem('hg_sync_last_success',new Date().toISOString());
        } catch(error) {
          this.write(this.list().map(r=>r.id===row.id?{...r,attempts:r.attempts+1,error:String((error as Error).message)}:r));
          break;
        }
      }
    } finally {this.busy=false;this.notify();}
  }
}
