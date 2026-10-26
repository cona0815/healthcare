import {FoodAnalysis} from '../types';
// Legacy cloud records use timestamp as ID. Preserve it when editing their time.
export const foodId=(food:FoodAnalysis)=>food.id||food.timestamp;
export const visibleFoods=(foods:FoodAnalysis[])=>Array.from(foods.reduce((map,f)=>{const old=map.get(foodId(f));if(!old||(f.revision||1)>(old.revision||1)||((f.revision||1)===(old.revision||1)&&!!f.deletedAt))map.set(foodId(f),{...f,id:foodId(f)});return map;},new Map<string,FoodAnalysis>()).values()).filter(f=>!f.deletedAt).sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp));
export const similarFood=(a:FoodAnalysis,b:FoodAnalysis)=>!b.deletedAt&&a.foodName.trim()===b.foodName.trim()&&a.mealType===b.mealType&&Number(a.calories)===Number(b.calories)&&Math.abs(Date.parse(a.timestamp)-Date.parse(b.timestamp))<5*60*1000;
