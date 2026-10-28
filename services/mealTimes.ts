import {FoodAnalysis,RiskLevel} from '../types';
import {localDate} from './healthSummary';
export function mealTimePoints(foods:FoodAnalysis[],date:string){return foods.flatMap((food,index)=>{const time=new Date(food.timestamp);if(!Number.isFinite(time.getTime())||localDate(time)!==date)return [];const minute=time.getHours()*60+time.getMinutes();return [{id:`${food.timestamp}-${index}`,minute,position:minute/1440*100,time:`${String(time.getHours()).padStart(2,'0')}:${String(time.getMinutes()).padStart(2,'0')}`,riskLevel:food.riskLevel||RiskLevel.UNKNOWN,foodName:food.foodName||'未命名餐點',meal:food.mealType||'餐點'}];}).sort((a,b)=>a.minute-b.minute);}
export function clusterMealTimes(points:ReturnType<typeof mealTimePoints>){const groups:Array<{id:string;position:number;points:typeof points}>=[];for(const point of points){const last=groups[groups.length-1];if(last&&point.minute-last.points[0].minute<90){last.points.push(point);last.position=last.points.reduce((s,p)=>s+p.position,0)/last.points.length;}else groups.push({id:point.id,position:point.position,points:[point]});}return groups;}

export function mealMarkerRating(levels:RiskLevel[]){
 const level=[RiskLevel.DANGEROUS,RiskLevel.MODERATE,RiskLevel.UNKNOWN,RiskLevel.SAFE].find(l=>levels.includes(l))||RiskLevel.UNKNOWN;
 return {level,...({SAFE:{color:'#34855c',label:'綠燈優選'},MODERATE:{color:'#d4a52a',label:'黃燈適量'},DANGEROUS:{color:'#d55c50',label:'紅燈注意'},UNKNOWN:{color:'#89938d',label:'未評級'}}[level])};
}
