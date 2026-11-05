import {test} from 'node:test';
import assert from 'node:assert/strict';
import {manualWorkout} from '../services/manualWorkout';
test('manual time record retains chosen activity and actual local date without fabricating sets or calories',()=>{
 const result=manualWorkout('walk',' 快走 ','30','2026-11-05T08:15:00+08:00',new Date('2026-11-05T12:00:00+08:00'));
 assert.deepEqual(result,{id:'walk',activity:'快走',duration:'30分鐘',timestamp:'2026-11-05T00:15:00.000Z'});
 assert.equal('sets' in result,false);assert.equal('caloriesBurned' in result,false);
});
test('empty, invalid duration and future manual records cannot be saved',()=>{
 const now=new Date('2026-11-05T12:00:00Z');
 for(const minutes of ['','0','-1','NaN','1441'])assert.throws(()=>manualWorkout('id','散步',minutes,'2026-11-05T01:00:00Z',now));
 assert.throws(()=>manualWorkout('id',' ','20','2026-11-05T01:00:00Z',now));
 assert.throws(()=>manualWorkout('id','散步','20','invalid',now));
 assert.throws(()=>manualWorkout('id','散步','20','2026-11-06T01:00:00Z',now));
});
