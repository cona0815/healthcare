import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {getStorageMode,getStoragePreference} from '../services/storageMode';
import {dbService,getGasUrl,setGasUrl,clearGasUrl} from '../services/dbService';
beforeEach(()=>{const rows=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>rows.set(k,v),removeItem:(k:string)=>rows.delete(k)}});});

test('an absent, empty or whitespace GAS URL always uses local storage, including legacy GAS preference',async()=>{
 for(const url of [null,'','   ']){
   localStorage.setItem('hg_storage_mode','gas');if(url===null)localStorage.removeItem('hg_gas_api_url');else localStorage.setItem('hg_gas_api_url',url);
   assert.equal(getStorageMode(),'local');assert.equal(getGasUrl(),null);
   await dbService.saveUserProfile({name:'本機測試'} as any);
   dbService.queueDelete('Appointments','local-visit');
   assert.equal(JSON.parse(localStorage.getItem('hg_profile')!).name,'本機測試');
   assert.equal(localStorage.getItem('hg_sync_queue_v1'),null);
 }
});
test('choosing GAS before entering a URL keeps the GAS preference visible while data stays local',()=>{
 localStorage.removeItem('hg_gas_api_url');localStorage.setItem('hg_storage_mode','gas');
 assert.equal(getStoragePreference(),'gas');assert.equal(getStorageMode(),'local');
 localStorage.setItem('hg_gas_api_url','https://example.test/exec');
 assert.equal(getStoragePreference(),'gas');assert.equal(getStorageMode(),'gas');
 localStorage.setItem('hg_storage_mode','local');
 assert.equal(getStoragePreference(),'local');assert.equal(getStorageMode(),'local');
 localStorage.removeItem('hg_storage_mode');
 assert.equal(getStoragePreference(),'gas');assert.equal(getStorageMode(),'gas');
 localStorage.removeItem('hg_gas_api_url');
 assert.equal(getStoragePreference(),'local');assert.equal(getStorageMode(),'local');
});
test('clearing GAS immediately falls back to local and preserves stored health data and old pending changes',async()=>{
 setGasUrl('  https://example.test/exec  ');assert.equal(getGasUrl(),'https://example.test/exec');
 localStorage.setItem('hg_sync_queue_v1','[{"id":"old","destination":"https://example.test/exec"}]');
 localStorage.setItem('hg_foodLogs','[{"id":"meal"}]');clearGasUrl();
 assert.equal(getStorageMode(),'local');assert.equal(getGasUrl(),null);
 await dbService.saveUserProfile({name:'保留本機'} as any);
 assert.equal(localStorage.getItem('hg_foodLogs'),'[{"id":"meal"}]');
 assert.equal(localStorage.getItem('hg_sync_queue_v1'),'[{"id":"old","destination":"https://example.test/exec"}]');
});
