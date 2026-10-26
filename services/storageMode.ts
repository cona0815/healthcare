export type StorageMode='local'|'gas';
export function getStorageMode(storage:Pick<Storage,'getItem'>=localStorage):StorageMode {const value=storage.getItem('hg_storage_mode');return value==='local'||value==='gas'?value:storage.getItem('hg_gas_api_url')?'gas':'local';}
export function setStorageMode(mode:StorageMode){localStorage.setItem('hg_storage_mode',mode);if(typeof window!=='undefined')window.dispatchEvent(new Event('health-storage-mode'));}
export const configuredGasUrl=()=>localStorage.getItem('hg_gas_api_url');
export const backupIntervalMs=(storage:Pick<Storage,'getItem'>=localStorage,demo=false)=>{const hours=Number(storage.getItem(demo?'hg_demo_local_backup_hours':'hg_local_backup_hours')||168);return ([24,168].includes(hours)?hours:168)*3600000;};
