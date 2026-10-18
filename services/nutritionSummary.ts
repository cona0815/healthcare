import { FoodAnalysis } from '../types';
export function nutritionSummary(meals: FoodAnalysis[]) {
 const total=(aliases:string[])=>{let known=false;let partial=false;let sum=0;for(const meal of meals){const n=meal.nutrients?.find(n=>aliases.includes(n.name.trim().toLowerCase()));const value=n?Number(String(n.amount).replace(/,/g,'')):NaN;const unit=n?.unit?.trim().toLowerCase();if(Number.isFinite(value)&&value>=0&&(unit==='g'||unit==='克'||unit==='mg'||unit==='毫克')){known=true;sum+=value/(unit==='mg'||unit==='毫克'?1000:1);}else partial=true;}return {value:known?Math.round(sum*10)/10:null,partial};};
 return {calories:meals.reduce((s,m)=>s+(Number(m.calories)||0),0),protein:total(['蛋白質','protein']),carbs:total(['碳水','碳水化合物','carbohydrate','carbohydrates']),fat:total(['脂肪','總脂肪','fat','total fat'])};
}
