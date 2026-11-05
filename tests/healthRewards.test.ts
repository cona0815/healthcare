import {test} from 'node:test';
import assert from 'node:assert/strict';
import {healthRewards,streakStats,workoutMinutes} from '../services/healthRewards';
import {FoodAnalysis,RiskLevel,UserProfile,WorkoutLog} from '../types';
process.env.TZ='Asia/Taipei';
const profile:UserProfile={height:'170',weight:'65',calorieGoal:1500,calorieGoalSource:'manual',fastingSchedule:{enabled:true,eatingStart:'08:00',eatingHours:12,fastingHours:12}};
const food=(date:string,time:string,mealType:FoodAnalysis['mealType'],calories=500):FoodAnalysis=>({id:`${date}-${time}-${mealType}`,timestamp:`${date}T${time}:00+08:00`,mealType,foodName:mealType,calories,riskLevel:RiskLevel.SAFE,nutrients:[],healthAdvice:''});
const meals=(date:string)=>[food(date,'08:00','早餐'),food(date,'12:00','午餐'),food(date,'19:00','晚餐')];
const workout=(id:string,date:string,duration:string):WorkoutLog=>({id,timestamp:`${date}T08:00:00+08:00`,activity:'快走',duration});
test('calendar streaks deduplicate dates, bridge month boundaries, preserve best and do not break before today ends',()=>{
 const dates=['2026-10-31','2026-11-01','2026-11-02','2026-11-02','2026-11-04'];
 const stat=streakStats(dates,'2026-11-05');assert.equal(stat.current,1);assert.equal(stat.best,3);assert.equal(stat.total,4);assert.deepEqual(stat.badges,[3]);
 assert.equal(streakStats([...dates,'2026-11-05'],'2026-11-05').current,2);
 assert.equal(streakStats(dates,'2026-11-06').current,0);
});
test('exercise sums daily minutes once per record and reaches 30 without requiring a single long session',()=>{
 const logs=[workout('one','2026-11-02','10分鐘'),workout('two','2026-11-02','20'),workout('three','2026-11-03','0.5小時'),workout('four','2026-11-04','30分鐘'),workout('today','2026-11-05','15分鐘'),workout('today','2026-11-05','15分鐘')];
 const now=new Date('2026-11-05T12:00:00+08:00');let r=healthRewards(profile,[],logs,now);
 assert.equal(r.stats.exercise.current,3);assert.equal(r.todayMinutes,15);assert.deepEqual(r.stats.exercise.badges,[3]);
 r=healthRewards(profile,[],[...logs,workout('today-second','2026-11-05','15分鐘'),workout('future','2026-11-06','60分鐘')],now);
 assert.equal(r.stats.exercise.current,4);assert.equal(r.todayMinutes,30);assert.equal(r.stats.exercise.total,4);
 assert.equal(workoutMinutes('1 小時 30 分鐘'),90);assert.equal(workoutMinutes('3組10次'),0);assert.equal(workoutMinutes('-30'),0);assert.equal(workoutMinutes('30-45分鐘'),0);assert.equal(workoutMinutes('30 mins'),30);
});
test('diet settles after day end, needs all three meals and includes snacks in calorie range',()=>{
 const foods=[...meals('2026-11-02'),...meals('2026-11-03'),...meals('2026-11-04'),...meals('2026-11-05')],now=new Date('2026-11-05T23:00:00+08:00');
 const r=healthRewards(profile,foods,[],now);assert.equal(r.stats.diet.current,3);assert.equal(r.todayDiet.qualified,true);assert.equal(r.stats.diet.total,3);
 assert.equal(healthRewards(profile,foods,[],new Date('2026-11-06T00:00:00+08:00')).stats.diet.current,4);
 assert.equal(healthRewards(profile,[...foods,food('2026-11-04','20:00','點心/飲料',200)],[],now).stats.diet.current,0);
 assert.equal(healthRewards(profile,meals('2026-11-04').map(f=>({...f,calories:50})),[],now).stats.diet.total,0);
 assert.equal(healthRewards(profile,meals('2026-11-04').slice(0,2),[],now).stats.diet.total,0);
});
test('traffic-light diet rule rejects unknown and red meals, and deleted food immediately recalculates',()=>{
 const p={...profile,rewardDietRule:'traffic' as const},now=new Date('2026-11-05T12:00:00+08:00'),foods=meals('2026-11-04');
 assert.equal(healthRewards(p,foods.map(f=>({...f,riskLevel:RiskLevel.MODERATE})),[],now).stats.diet.total,1);
 for(const riskLevel of [RiskLevel.UNKNOWN,RiskLevel.DANGEROUS])assert.equal(healthRewards(p,[{...foods[0],riskLevel},...foods.slice(1)],[],now).stats.diet.total,0);
 assert.equal(healthRewards(profile,[{...foods[0],deletedAt:now.toISOString()},...foods],[],now).stats.diet.total,0);
});
test('fasting rewards need next-day breakfast proof and no recorded food during fasting',()=>{
 const foods=['2026-11-01','2026-11-02','2026-11-03','2026-11-04'].flatMap(meals),now=new Date('2026-11-04T12:00:00+08:00');
 const r=healthRewards(profile,foods,[],now);assert.deepEqual(r.stats.fasting.dates,['2026-11-01','2026-11-02','2026-11-03']);assert.equal(r.stats.fasting.current,3);
 assert.equal(healthRewards(profile,[...foods,food('2026-11-03','22:00','點心/飲料')],[],now).stats.fasting.current,0);
 assert.equal(healthRewards(profile,meals('2026-11-01'),[],now).stats.fasting.total,0);
 assert.equal(healthRewards(profile,[...meals('2026-11-01'),...meals('2026-11-03')],[],now).stats.fasting.total,0);
 const early=foods.map(f=>f.mealType==='早餐'&&f.timestamp.startsWith('2026-11-04')?{...f,timestamp:'2026-11-04T07:00:00+08:00'}:f);
 assert.equal(healthRewards(profile,early,[],now).stats.fasting.current,0);
});
test('pending morning confirmation preserves prior fasting streak; paused schedule does not erase history',()=>{
 const foods=['2026-11-01','2026-11-02','2026-11-03'].flatMap(meals),now=new Date('2026-11-04T07:00:00+08:00');
 const r=healthRewards(profile,foods,[],now);assert.equal(r.pendingFasting,true);assert.equal(r.stats.fasting.current,2);
 const paused={...profile,fastingSchedule:{...profile.fastingSchedule!,enabled:false}};assert.equal(healthRewards(paused,foods,[],now).stats.fasting.best,2);
 assert.equal(healthRewards({...profile,fastingSchedule:undefined},foods,[],now).stats.fasting.total,0);
});
test('missing calorie target never grants calorie-control badges',()=>{
 const r=healthRewards({height:'',weight:''},meals('2026-11-04'),[],new Date('2026-11-05T12:00:00+08:00'));
 assert.equal(r.stats.diet.total,0);assert.equal(r.goal,undefined);
});
