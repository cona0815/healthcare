import {getLocal} from '../services/dbService';
import React,{useState,useRef,useEffect} from 'react';
import {FoodAnalysis,MealType,RiskLevel} from '../types';
import {foodId} from '../services/foodRecords';
import {localDate} from '../services/healthSummary';
import {nutritionSummary} from '../services/nutritionSummary';
import {makeFoodThumbnail} from '../services/foodThumbnail';

export interface MealActions {onEdit:(id:string,food:FoodAnalysis)=>Promise<void>;onDelete:(id:string)=>Promise<void>;onRestore:(id:string)=>Promise<void>;}
export default function MealManager({foods,date=localDate(),onEdit,onDelete,onRestore}:MealActions&{foods:FoodAnalysis[];date?:string}){
 const [editing,setEditing]=useState<FoodAnalysis|null>(null),[deleting,setDeleting]=useState<FoodAnalysis|null>(null),[undo,setUndo]=useState<string|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[photo,setPhoto]=useState<string>();
 const locked=useRef(false);const dialog=useRef<HTMLDialogElement>(null);
 const trash=getLocal<FoodAnalysis[]>('hg_foodLogs',[]).filter(f=>f.deletedAt).sort((a,b)=>String(b.deletedAt).localeCompare(String(a.deletedAt)));
 const meals=foods.filter(f=>localDate(f.timestamp)===date);
 useEffect(()=>{if(editing||deleting)dialog.current?.showModal();else dialog.current?.close();},[editing,deleting]);
 const run=async(action:()=>Promise<void>)=>{if(locked.current)return;locked.current=true;setBusy(true);setMessage('');try{await action();}catch(e){setMessage((e as Error).message||'儲存失敗，請重試');}finally{locked.current=false;setBusy(false);}};
 const edit=(food:FoodAnalysis)=>{setPhoto(food.thumbnail);setEditing(food);setMessage('');};
 return <details className="meal-management"><summary>管理{date===localDate()?'今日':date}餐點 <span>{meals.length} 筆 · 編輯／刪除</span></summary>
 <div className="meal-management-list">{meals.length?meals.map(f=><div className="meal-manage-row" key={foodId(f)}>{f.thumbnail&&<img className="food-thumbnail" src={f.thumbnail} alt="餐點縮圖"/>}<div><strong>{f.foodName||'未命名餐點'}</strong><small>{new Date(f.timestamp).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit',hour12:false})} · {f.mealType} · {f.calories} kcal</small></div><button onClick={()=>edit(f)} aria-label={`編輯 ${f.foodName}`}>編輯</button><button onClick={()=>{setDeleting(f);setMessage('');}} aria-label={`刪除 ${f.foodName}`}>刪除</button></div>):<p>當日尚無餐點。</p>}</div>
 <details className="meal-trash"><summary>餐點回收桶（{trash.length}）</summary><p>保留所有已刪除餐點，重新開啟後仍可復原；不會自動清空。</p>{trash.map(f=><div className="meal-manage-row" key={foodId(f)}><div><strong>{f.foodName}</strong><small>{localDate(f.timestamp)} · {f.mealType} · {f.calories} kcal</small></div><button disabled={busy} onClick={()=>void run(async()=>{await onRestore(foodId(f));setUndo(null);setMessage('已復原餐點，請查看原進食日期');})}>復原餐點</button></div>)}</details>
 {undo&&<p className="meal-undo" role="status">餐點已刪除 <button disabled={busy} onClick={()=>void run(async()=>{await onRestore(undo);setUndo(null);setMessage('已復原餐點');})}>復原</button></p>}
 {message&&!editing&&!deleting&&<p role="status">{message}</p>}
 <dialog ref={dialog} className="meal-editor" onCancel={e=>{if(busy)e.preventDefault();else{setEditing(null);setDeleting(null);}}}>
 {deleting&&<div><h2>刪除這筆餐點？</h2><p>{deleting.foodName} · {deleting.calories} kcal</p><p>當日營養與進食時間會一起更新，可在此頁復原。</p><div className="meal-editor-actions"><button disabled={busy} onClick={()=>setDeleting(null)}>取消</button><button disabled={busy} onClick={()=>void run(async()=>{const id=foodId(deleting);await onDelete(id);setUndo(id);setDeleting(null);})}>{busy?'處理中…':'確定刪除'}</button></div></div>}
 {editing&&<form key={foodId(editing)} onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget);void run(async()=>{const timestamp=new Date(String(form.get('time'))).toISOString();const name=String(form.get('name')).trim();if(!name)throw new Error('請填寫餐點名稱');const nutrients=editing.nutrients.filter(n=>!['蛋白質','protein','碳水','碳水化合物','carbohydrate','carbohydrates','脂肪','總脂肪','fat','total fat'].includes(n.name.trim().toLowerCase()));for(const [key,name] of [['protein','蛋白質'],['carbs','碳水化合物'],['fat','脂肪']]){const value=String(form.get(key));if(value!=='')nutrients.push({name,amount:value,unit:'g'});}await onEdit(foodId(editing),{...editing,foodName:name,mealType:String(form.get('meal')) as MealType,calories:Number(form.get('calories')),estimatedWeight:String(form.get('weight')),timestamp,nutrients,thumbnail:photo,riskLevel:RiskLevel.UNKNOWN,healthAdvice:'手動修正紀錄，原 AI 建議需重新評估',diagnosis:undefined});setEditing(null);setMessage('餐點已更新');});}}>
 <h2>編輯餐點</h2><fieldset disabled={busy}>
 <label>名稱<input name="name" defaultValue={editing.foodName} required maxLength={100}/></label>
 <div className="meal-form-grid"><label>餐別<select name="meal" defaultValue={editing.mealType}>{['早餐','午餐','晚餐','點心/飲料'].map(m=><option key={m}>{m}</option>)}</select></label><label>熱量 kcal<input name="calories" type="number" min="0" max="20000" step="any" defaultValue={editing.calories} required/></label></div>
 <label>進食日期與時間<input name="time" type="datetime-local" required defaultValue={`${localDate(editing.timestamp)}T${new Date(editing.timestamp).toTimeString().slice(0,5)}`}/></label><small>改成其他日期後，會移至該日紀錄。</small>
 <label>份量（選填）<input name="weight" maxLength={100} defaultValue={editing.estimatedWeight} placeholder="例如：一碗 / 250 g"/></label>
 <div className="meal-form-grid macros">{([['protein','蛋白質'],['carbs','碳水'],['fat','脂肪']] as const).map(([key,label])=><label key={key}>{label} g<input name={key} type="number" min="0" max="10000" step="any" defaultValue={nutritionSummary([editing])[key].value??''} placeholder="未填"/></label>)}</div>
 <label>更換照片<input type="file" accept="image/*" onChange={e=>{const file=e.target.files?.[0];if(file)void run(async()=>setPhoto(await makeFoodThumbnail(file)));e.target.value='';}}/></label>{photo&&<div className="meal-photo-preview"><img src={photo} alt="餐點照片預覽"/><button type="button" onClick={()=>setPhoto(undefined)}>移除照片</button></div>}
 <div className="meal-editor-actions"><button type="button" onClick={()=>setEditing(null)}>取消</button><button type="submit">{busy?'儲存中…':'儲存修改'}</button></div></fieldset></form>}
 {message&&<p role="alert">{message}</p>}
 </dialog></details>;
}
