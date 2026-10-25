export interface PendingChange { id: string; destination: string; key: string; payload: any; createdAt: string; attempts: number; error?: string; }
export class SyncQueue {
  busy = false;
  constructor(private storage: Storage, private send: (payload: any, destination: string)=>Promise<any>, private notify: ()=>void = ()=>{}) {}
  list(): PendingChange[] { return JSON.parse(this.storage.getItem('hg_sync_queue_v1') || '[]'); }
  private write(rows: PendingChange[]) { this.storage.setItem('hg_sync_queue_v1', JSON.stringify(rows)); this.notify(); }
  enqueue(destination: string, key: string, payload: any) {
    const item = {id:crypto.randomUUID(),destination,key,payload,createdAt:new Date().toISOString(),attempts:0};
    this.write([...this.list().filter(row=>!(row.destination===destination&&row.key===key)),item]);
  }
  async flush(destination: string, includeUnassigned=false) {
    if(this.busy || !destination) return;
    this.busy=true; this.notify();
    try {
      if(includeUnassigned) this.write(this.list().map(r=>r.destination?r:{...r,destination}));
      for(const row of this.list().filter(r=>r.destination===destination)) {
        // A newer edit can replace an item while another request is in flight.
        if(!this.list().some(r=>r.id===row.id)) continue;
        try {
          const response=await this.send(row.payload,destination);
          if(response?.status!=='success' && !(row.payload.action==='delete' && response?.status==='deleted')) throw new Error(response?.message || '雲端未確認儲存成功');
          this.write(this.list().filter(r=>r.id!==row.id));
          this.storage.setItem('hg_sync_last_success',new Date().toISOString());
        } catch(error) {
          this.write(this.list().map(r=>r.id===row.id?{...r,attempts:r.attempts+1,error:String((error as Error).message)}:r));
          break;
        }
      }
    } finally {this.busy=false;this.notify();}
  }
}
