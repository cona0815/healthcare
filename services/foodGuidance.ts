export interface FoodGuide {title:string;prefer:string;limit:string;note:string;source:string;url:string}
const dash='https://www.nhlbi.nih.gov/health/dash-eating-plan';
export function foodGuides(conditions:string[]=[],allergies=''):FoodGuide[]{
 const value=conditions.join(' ').toLowerCase();
 if(/腎|ckd|kidney/.test(value))return [{title:'腎臟病：先確認個人限制',prefer:'先依腎功能、血鉀、血磷及是否透析，確認適合的食物與份量。',limit:'避免自行增加高鉀食物、含鉀代鹽、蛋白質補充品或飲水量。',note:'腎臟病會改變其他病症的飲食建議，因此暫不套用通用「多吃」清單；請與腎臟科或營養師確認。',source:'NIDDK 腎臟病飲食',url:'https://www.niddk.nih.gov/health-information/kidney-disease/chronic-kidney-disease-ckd/healthy-eating-adults-chronic-kidney-disease'}];
 if(allergies.trim())return [{title:'先核對過敏與忌口',prefer:'你已填寫過敏／忌口；先與專業人員核對食材及替代選擇。',limit:'避免已知過敏原，購買時檢查成分與交叉接觸標示。',note:'目前無法可靠解析自由文字過敏原，所以先不列出可能含過敏原的推薦食物。',source:'NIDDK 個人化飲食',url:'https://www.niddk.nih.gov/health-information/diabetes/overview/healthy-living-with-diabetes'}];
 const result:FoodGuide[]=[];
 if(/糖尿|diabetes/.test(value))result.push({title:'糖尿病・穩定分配碳水',prefer:'非澱粉蔬菜、適量全穀及瘦蛋白；餐盤可用半盤蔬菜、四分之一蛋白質、四分之一碳水作為起點。',limit:'減少含糖飲料與甜點；水果、飯麵與奶類仍需計入碳水份量。',note:'不是把碳水全部戒掉。若使用胰島素或可能低血糖的藥物，調整餐次／16:8 前先與醫療團隊討論。',source:'NIDDK 糖尿病生活與飲食',url:'https://www.niddk.nih.gov/health-information/diabetes/overview/healthy-living-with-diabetes'});
 if(/高血壓|hypertension/.test(value))result.push({title:'高血壓・少鹽多原型',prefer:'蔬菜、水果、全穀，搭配低脂乳品、豆類或魚；依每日目標分配份量。',limit:'減少加工肉、醃製品、泡麵湯與重鹹醬料，選擇低鈉產品。',note:'有腎臟病或需限制鉀者，不能直接套用高鉀飲食；含鉀代鹽也需先確認。',source:'NHLBI DASH 飲食',url:dash});
 if(/高血脂|hyperlipidemia/.test(value))result.push({title:'高血脂・調整脂肪來源',prefer:'全穀、蔬果、魚、豆類與適量植物油，取代高飽和脂肪食物。',limit:'減少肥肉、全脂乳品、奶油及含糖飲料；份量仍需配合每日熱量。',note:'這是一般心血管健康飲食方向，並非個別血脂類型的治療處方。',source:'NHLBI DASH 飲食',url:dash});
 return result;
}
