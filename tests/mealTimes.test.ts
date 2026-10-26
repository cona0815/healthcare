import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mealTimePoints,clusterMealTimes} from '../services/mealTimes';
import {localDate} from '../services/healthSummary';
const food=(d:Date,name='測試')=>({timestamp:d.toISOString(),foodName:name,mealType:'早餐'} as any);
test('meal times use device local clock, filter other dates and invalid timestamps, and sort',()=>{const day=new Date(2026,9,25,12);const points=mealTimePoints([food(new Date(2026,9,25,18,30)),food(new Date(2026,9,24,23,59)),{timestamp:'bad'} as any,food(new Date(2026,9,25,8,15))],localDate(day));assert.deepEqual(points.map(p=>p.time),['08:15','18:30']);assert.equal(points[0].position,495/1440*100);});
test('nearby meal markers group but retain every meal and separate distant meals',()=>{const points=mealTimePoints([food(new Date(2026,9,25,12,0),'一'),food(new Date(2026,9,25,12,10),'二'),food(new Date(2026,9,25,18),'三')],'2026-10-25');const groups=clusterMealTimes(points);assert.equal(groups.length,2);assert.equal(groups[0].points.length,2);assert.equal(new Set(points.map(p=>p.id)).size,3);});
