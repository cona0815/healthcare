import React,{useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {localDate} from '../services/healthSummary';
interface Props {date:string;onSelect:(date:string)=>void;markers:Record<string,string[]>;disabled?:boolean;}
export default function TaskCalendar({date,onSelect,markers,disabled}:Props){
 const [month,setMonth]=useState(()=>date.slice(0,7));
 const first=new Date(`${month}-01T12:00:00`),year=first.getFullYear(),index=first.getMonth();
 const days=new Date(year,index+1,0).getDate(),today=localDate();
 const shift=(n:number)=>setMonth(localDate(new Date(year,index+n,1,12)).slice(0,7));
 return <section className="task-calendar" aria-label="待辦與紀錄日曆"><header><button disabled={disabled} aria-label="上個月" onClick={()=>shift(-1)}><ChevronLeft size={20}/></button><h2>{year} 年 {index+1} 月</h2><button disabled={disabled} aria-label="下個月" onClick={()=>shift(1)}><ChevronRight size={20}/></button><button disabled={disabled} className="calendar-today" onClick={()=>{setMonth(today.slice(0,7));onSelect(today);}}>回今天</button></header><div className="task-calendar-grid">{['日','一','二','三','四','五','六'].map(d=><span key={d} className="calendar-weekday">{d}</span>)}{Array.from({length:first.getDay()},(_,i)=><span key={`blank-${i}`}/>)}{Array.from({length:days},(_,i)=>{const key=`${month}-${String(i+1).padStart(2,'0')}`,items=markers[key]||[];return <button key={key} disabled={disabled} aria-pressed={key===date} aria-current={key===today?'date':undefined} aria-label={`${key}${items.length?'，'+items.join('、'):''}`} onClick={()=>onSelect(key)}><span>{i+1}</span><small aria-hidden="true">{items.slice(0,5).map(item=><i key={item} className={`calendar-dot dot-${item}`}/>)}</small></button>;})}</div><p className="calendar-legend"><span>● 飲食</span><span>● 運動</span><span>● 用藥</span><span>● 回診</span><span>● 症狀</span></p><p className="calendar-help">點日期查看當日待辦與紀錄；圓點表示已有紀錄或回診安排。</p></section>;
}
