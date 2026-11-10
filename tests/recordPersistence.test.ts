import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {dbService,getLocal,syncQueue} from '../services/dbService';
import {SavedAppointment,WorkoutLog,HealthReport} from '../types';

beforeEach(()=>{
 const rows=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>rows.set(k,v),removeItem:(k:string)=>rows.delete(k)}});
 localStorage.setItem('hg_storage_mode','gas');localStorage.setItem('hg_gas_api_url','https://example.test/exec');localStorage.setItem('hg_auto_sync','false');
});
const appointment={id:'visit-1',title:'示範門診',date:'2026-11-07',time:'10:00',doctor:'',location:'',appointmentNumber:'',notes:'',createdAt:'2026-11-01T00:00:00Z'} as SavedAppointment;

test('editing an appointment replaces its stable ID without a delete or duplicate',async()=>{
 await dbService.saveAppointment(appointment);
 await dbService.saveAppointment({...appointment,time:'11:00'});
 await dbService.saveAppointment({...appointment,time:'11:00'});
 assert.deepEqual(getLocal('hg_appointments',[]),[{...appointment,time:'11:00'}]);
 assert.equal(syncQueue.list().length,1);assert.equal(syncQueue.list()[0].payload.action,'save');
 assert.equal(syncQueue.list()[0].payload.data.time,'11:00');
});
test('failed appointment edit leaves the original record and queue intact',async()=>{
 await dbService.saveAppointment(appointment);const queue=JSON.stringify(syncQueue.list());
 const original=localStorage.setItem;localStorage.setItem=(key,value)=>{if(key==='hg_appointments')throw new Error('QuotaExceeded');original(key,value);};
 await assert.rejects(dbService.saveAppointment({...appointment,time:'11:00'}),/QuotaExceeded/);
 assert.deepEqual(getLocal('hg_appointments',[]),[appointment]);assert.equal(JSON.stringify(syncQueue.list()),queue);
});
test('retrying a workout ID sends the stored version, not different unsaved values',async()=>{
 const log={id:'run-1',activity:'散步',duration:'30 分鐘',timestamp:'2026-11-07T08:00:00Z'} as WorkoutLog;
 await dbService.addWorkoutLog(log);await dbService.addWorkoutLog({...log,duration:'60 分鐘'});
 assert.deepEqual(getLocal('hg_workouts',[]),[log]);assert.deepEqual(syncQueue.list()[0].payload.data,log);
});
test('retrying a report save does not duplicate the same analysis',async()=>{
 const report={analyzedAt:'2026-11-07T08:00:00Z',summary:'示範',metrics:[],dietaryRestrictions:[]} as HealthReport;
 await dbService.addHealthReport(report);await dbService.addHealthReport(report);
 assert.deepEqual(getLocal('hg_reports',[]),[report]);assert.equal(syncQueue.list().length,1);
});
