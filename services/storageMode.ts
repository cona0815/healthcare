export type StorageMode='local'|'gas';
export function getStorageMode(storage:Pick<Storage,'getItem'>=localStorage):StorageMode {
 const url=storage.getItem('hg_gas_api_url')?.trim();
 if(!url)return 'local';
 return storage.getItem('hg_storage_mode')==='local'?'local':'gas';
}
export function getStoragePreference(storage:Pick<Storage,'getItem'>=localStorage):StorageMode {
 const mode=storage.getItem('hg_storage_mode');
 if(mode==='gas')return 'gas';
 if(mode==='local')return 'local';
 return storage.getItem('hg_gas_api_url')?.trim()?'gas':'local';
}
export function setStorageMode(mode:StorageMode){localStorage.setItem('hg_storage_mode',mode);if(typeof window!=='undefined')window.dispatchEvent(new Event('health-storage-mode'));}
export const configuredGasUrl=()=>localStorage.getItem('hg_gas_api_url')?.trim()||null;
export const backupIntervalMs=(storage:Pick<Storage,'getItem'>=localStorage,demo=false)=>{const hours=Number(storage.getItem(demo?'hg_demo_local_backup_hours':'hg_local_backup_hours')||168);return ([24,168].includes(hours)?hours:168)*3600000;};
