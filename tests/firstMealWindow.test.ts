import {test} from 'node:test';
import assert from 'node:assert/strict';
import {firstMealWindow} from '../services/nutritionGoals';
import {foodAdviceLanguage} from '../services/foodLanguage';
const meal=(timestamp:string)=>({timestamp});
test('first meal starts countdown, later meals do not restart, then fasting and waiting',()=>{
 const foods=[meal('2026-10-28T08:30:00+08:00'),meal('2026-10-28T12:00:00+08:00')];
 assert.equal(firstMealWindow(new Date('2026-10-28T08:00:00+08:00'),foods,12,12),null);
 assert.equal(firstMealWindow(new Date('2026-10-28T08:30:00+08:00'),foods,12,12)?.seconds,43200);
 assert.equal(firstMealWindow(new Date('2026-10-28T12:30:00+08:00'),foods,12,12)?.seconds,28800);
 assert.equal(firstMealWindow(new Date('2026-10-28T20:30:00+08:00'),foods,12,12)?.phase,'fasting');
 assert.equal(firstMealWindow(new Date('2026-10-29T08:30:00+08:00'),foods,12,12),null);
});
test('cross-midnight, deleted and edited first meal, invalid dates and new cycles',()=>{
 const now=new Date('2026-10-29T01:00:00+08:00');
 assert.equal(firstMealWindow(now,[meal('2026-10-28T22:00:00+08:00')],6,12)?.seconds,10800);
 assert.equal(firstMealWindow(now,[{...meal('2026-10-28T22:00:00+08:00'),deletedAt:'removed'},meal('bad')],6,12),null);
 assert.equal(firstMealWindow(now,[meal('2026-10-28T23:00:00+08:00')],6,12)?.seconds,14400);
 assert.equal(firstMealWindow(now,[meal('2026-10-27T08:00:00+08:00'),meal('2026-10-28T22:00:00+08:00')],6,12)?.seconds,10800);
 assert.throws(()=>firstMealWindow(now,[],0,12));
});
test('food wording does not assert elevated glucose just from a disease label',()=>{assert.equal(foodAdviceLanguage('糖尿病需注意糖分'),'血糖管理需求需注意糖分');});
