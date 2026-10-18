import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nutritionSummary} from '../services/nutritionSummary';
import {FoodAnalysis,RiskLevel} from '../types';
const food=(nutrients:FoodAnalysis['nutrients']):FoodAnalysis=>({foodName:'test',calories:100,nutrients,mealType:'早餐',timestamp:'2026-10-18T00:00:00Z',riskLevel:RiskLevel.UNKNOWN,healthAdvice:''});
test('missing nutrients are unknown, not zero',()=>{assert.equal(nutritionSummary([food([])]).protein.value,null);});
test('convert units and retain missing-data status',()=>{const n=nutritionSummary([food([{name:'蛋白質',amount:'500',unit:'mg'}]),food([])]);assert.equal(n.protein.value,0.5);assert.equal(n.protein.partial,true);assert.equal(n.calories,200);});
test('saturated fat is not counted as total fat',()=>{const n=nutritionSummary([food([{name:'飽和脂肪',amount:'4',unit:'g'},{name:'脂肪',amount:'12',unit:'g'}])]);assert.equal(n.fat.value,12);});
test('unparseable AI estimates are not silently converted',()=>{assert.equal(nutritionSummary([food([{name:'蛋白質',amount:'約20',unit:'g'}])]).protein.value,null);});
