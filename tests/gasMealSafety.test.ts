import {test} from 'node:test';import assert from 'node:assert/strict';
import {gasHarness} from './gasHarness';
import {createBackup} from '../services/deviceBackup';
test('GAS detects same-version cross-device deletion and accepts only identical operation retries',()=>{
 const h=gasHarness();const meal={id:'meal',revision:1,foodName:'飯',timestamp:'2026-10-26T04:00:00Z',thumbnail:'data:image/jpeg;base64,'+'A'.repeat(55000)};
 const send=(data:any,baseRevision:number,operationId:string)=>h.send({action:'save_meal_v3',data,baseRevision,operationId});
 assert.equal(send(meal,0,'add').status,'success');assert.equal(send(meal,0,'add').status,'success');
 assert.equal(send({...meal,revision:2,calories:400},1,'edit-A').status,'success');
 assert.equal(send({...meal,revision:2,deletedAt:'2026-10-26T04:00:00Z'},1,'delete-B').status,'conflict');
 assert.equal(send({...meal,revision:3,deletedAt:'2026-10-26T04:00:00Z'},2,'delete-confirmed').status,'success');
 const read=h.send({action:'read_all'});assert.ok(read.foodLogs[0].deletedAt);assert.equal(read.foodLogs[0].thumbnail,meal.thumbnail);
 assert.equal(h.send({action:'save',type:'FoodLogs',data:meal}).status,'error');
});
test('cloud snapshots retain previous backups and live data, reject incomplete and tampered chunks',()=>{
 const h=gasHarness();const backup=createBackup({getItem:()=>null} as any,false);backup.data.hg_foodLogs=[{foodName:'飯',timestamp:'2026-10-26T04:00:00Z',thumbnail:'data:image/jpeg;base64,'+'A'.repeat(55000)}];backup.data.hg_jog_reports_v1=[{id:'jog',createdAt:'2026-10-26T04:00:00Z'}];
 const first=h.send({action:'backup_snapshot_v3',data:backup});assert.equal(first.status,'success');
 h.setFailure(true);assert.equal(h.send({action:'backup_snapshot_v3',data:backup}).status,'error');h.setFailure(false);
 assert.equal(h.send({action:'list_backups_v3'}).backups.length,1);
 assert.deepEqual(h.send({action:'read_backup_v3',backupId:first.backupId}).backup,backup);
 const next=h.send({action:'backup_snapshot_v3',data:{...backup,createdAt:'2026-10-27T00:00:00Z'}});assert.equal(next.status,'success');assert.equal(h.send({action:'list_backups_v3'}).backups.length,2);
 assert.equal(h.send({action:'read_all'}).foodLogs.length,0);
 h.sheets.get(next.backupId).rows[0][1]+='corrupted';assert.equal(h.send({action:'read_backup_v3',backupId:next.backupId}).status,'error');
 assert.equal(h.send({action:'backup_all',data:{foodLogs:[]}}).status,'error');
});

test('interrupted meal write preserves last committed meal and no false success',()=>{
 const h=gasHarness();const data={id:'m',revision:1,foodName:'飯',timestamp:'2026-10-26T00:00:00Z'};
 assert.equal(h.send({action:'save_meal_v3',data,baseRevision:0,operationId:'first'}).status,'success');
 h.setFailure(true);assert.equal(h.send({action:'save_meal_v3',data:{...data,revision:2,deletedAt:'2026-10-26T01:00:00Z'},baseRevision:1,operationId:'second'}).status,'error');h.setFailure(false);
 assert.equal(h.send({action:'read_all'}).foodLogs[0].operationId,'first');
});
