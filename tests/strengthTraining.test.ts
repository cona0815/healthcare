import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lastStrengthWorkout,remainingRest,strengthHistory,trainingStats,validTrainingSets,weekdayIndex} from '../services/strengthTraining';
import {createBackup,parseBackup,restoreBackup} from '../services/deviceBackup';
import {WorkoutLog} from '../types';
import {gasHarness} from './gasHarness';
const log=(id:string,activity:string,timestamp:string,weight=10):WorkoutLog=>({id,activity,timestamp,duration:'20分鐘',restSeconds:60,sets:[{reps:10,weightKg:weight},{reps:8,weightKg:weight+2.5}]});
function memory(){const m=new Map<string,string>();return {getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v);},removeItem:(k:string)=>{m.delete(k);}} as Storage;}
test('last values use exact normalized exercise, newest actual dated strength log, never future or legacy rows',()=>{
 const rows=[log('a','胸推','2026-10-29T08:00:00Z'),log('b',' 胸推 ','2026-10-30T08:00:00Z',20),log('c','胸推','2030-10-29T08:00:00Z',30),log('d','胸推機','2026-10-31T08:00:00Z'),{id:'old',activity:'胸推',duration:'30分鐘',timestamp:'2026-10-31T08:00:00Z'}];
 assert.equal(lastStrengthWorkout(rows,'胸推',new Date('2026-11-01T00:00:00Z'))?.id,'b');
 assert.equal(lastStrengthWorkout(rows,'深蹲'),undefined);
 const draft=lastStrengthWorkout(rows,'胸推',new Date('2026-11-01T00:00:00Z'))!.sets!.map(s=>({...s}));draft[0].reps=99;assert.equal(rows[1].sets![0].reps,10);
});
test('training totals preserve zero-load bodyweight reps, decimals and chronological progress',()=>{
 assert.deepEqual(trainingStats([{reps:10,weightKg:12.5},{reps:8,weightKg:15}]),{sets:2,reps:18,volume:245,maxWeight:15});
 assert.equal(trainingStats([{reps:15,weightKg:0}]).reps,15);
 const rows=strengthHistory([log('b','胸推','2026-10-30',20),log('a','胸推','2026-10-29')],'胸推');assert.deepEqual(rows.map(r=>r.id),['a','b']);assert.equal(rows[1].stats.maxWeight-rows[0].stats.maxWeight,10);
 assert.ok(validTrainingSets([{reps:1,weightKg:0}]));for(const bad of [[],[{reps:0,weightKg:10}],[{reps:1.5,weightKg:10}],[{reps:10,weightKg:-1}],[{reps:10,weightKg:NaN}]])assert.equal(validTrainingSets(bad),false);
});
test('rest timer uses wall clock including background time and clamps to zero',()=>{assert.equal(remainingRest(61000,1000),60);assert.equal(remainingRest(61000,60500),1);assert.equal(remainingRest(61000,90000),0);assert.equal(remainingRest(null),0);assert.equal(weekdayIndex('星期一'),0);assert.equal(weekdayIndex('週日'),6);assert.equal(weekdayIndex('Monday'),0);assert.equal(weekdayIndex('自訂'),-1);});
test('backup and GAS retain individual sets and weekly plans without replacing legacy rows',()=>{
 const s=memory(),workout=log('sets','胸推','2026-11-01T00:00:00Z');s.setItem('hg_workouts',JSON.stringify([workout,{id:'legacy',activity:'快走',duration:'20分鐘',timestamp:'2026-10-30T00:00:00Z'}]));
 s.setItem('hg_workoutPlan',JSON.stringify([{id:'plan',day:'週一',activity:'胸推',duration:'20分鐘',intensity:'自訂',notes:'',sets:workout.sets,restSeconds:60}]));
 const backup=parseBackup(JSON.stringify(createBackup(s,false))),target=memory();restoreBackup(target,backup,false);assert.deepEqual(JSON.parse(target.getItem('hg_workouts')!),backup.data.hg_workouts);assert.deepEqual(JSON.parse(target.getItem('hg_workoutPlan')!),backup.data.hg_workoutPlan);
 const h=gasHarness();assert.equal(h.send({action:'save',type:'Workouts',data:workout}).status,'success');assert.equal(h.send({action:'save',type:'WorkoutPlan',data:{timestamp:workout.timestamp,planJson:JSON.stringify(backup.data.hg_workoutPlan)}}).status,'success');const cloud=h.send({action:'read_all'});assert.deepEqual(JSON.parse(JSON.stringify(cloud.workouts[0].sets)),workout.sets);assert.deepEqual(JSON.parse(JSON.stringify(cloud.workoutPlan[0].planJson)),backup.data.hg_workoutPlan);
 backup.data.hg_workouts[0].sets[0].weightKg=-10;assert.throws(()=>parseBackup(JSON.stringify(backup)));
});

test('two sessions in the same minute retain newest-first source order for comparison',()=>{
 const rows=strengthHistory([log('new','胸推','2026-11-01T08:00:00Z',15),log('old','胸推','2026-11-01T08:00:00Z',12.5)],'胸推');
 assert.deepEqual(rows.map(r=>r.id),['old','new']);assert.equal(rows[1].stats.maxWeight-rows[0].stats.maxWeight,2.5);
});
