import React,{useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {localDate} from '../services/healthSummary';
interface Props {date:string;onSelect:(date:string)=>void;markers:Record<string,string[]>;disabled?:boolean;}
export default function TaskCalendar({date,onSelect,markers,disabled}:Props){
 const [month,setMonth]=useState(()=>date.slice(0,7));
 const [expanded,setExpanded]=useState(false);
 const weekStart=new Date(`${date}T12:00:00`);weekStart.setDate(weekStart.getDate()-weekStart.getDay());
 const week=Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(d.getDate()+i);return localDate(d);});
 const first=new Date(`${month}-01T12:00:00`),year=first.getFullYear(),index=first.getMonth();
 const days=new Date(year,index+1,0).getDate(),today=localDate();
 const shift=(n:number)=>{if(expanded)setMonth(localDate(new Date(year,index+n,1,12)).slice(0,7));else{const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+7*n);const next=localDate(d);setMonth(next.slice(0,7));onSelect(next);}};
 const dates=expanded?Array.from({length:days},(_,i)=>`${month}-${String(i+1).padStart(2,'0')}`):week;
 return <section className="task-calendar" aria-label="待辦與紀錄日曆"><header><button disabled={disabled} aria-label={expanded?'上個月':'上一週'} onClick={()=>shift(-1)}><ChevronLeft size={20}/></button><h2>{expanded?`${year} 年 ${index+1} 月`:`${Number(week[0].slice(5,7))}/${Number(week[0].slice(8))} — ${Number(week[6].slice(5,7))}/${Number(week[6].slice(8))}`}</h2><button disabled={disabled} aria-label={expanded?'下個月':'下一週'} onClick={()=>shift(1)}><ChevronRight size={20}/></button><button disabled={disabled} className="calendar-today" onClick={()=>{setMonth(today.slice(0,7));onSelect(today);}}>回今天</button></header><div id="health-calendar-dates" className="task-calendar-grid">{['日','一','二','三','四','五','六'].map(d=><span key={d} className="calendar-weekday">{d}</span>)}{Array.from({length:expanded?first.getDay():0},(_,i)=><span key={`blank-${i}`}/>)}{dates.map(key=>{const items=markers[key]||[];return <button key={key} disabled={disabled} aria-pressed={key===date} aria-current={key===today?'date':undefined} aria-label={`${key}${items.length?'，'+items.join('、'):''}`} onClick={()=>onSelect(key)}><span>{Number(key.slice(8))}</span><small aria-hidden="true">{items.slice(0,5).map(item=><i key={item} className={`calendar-dot dot-${item}`}/>)}</small></button>;})}</div><p className="calendar-legend"><span>● 飲食</span><span>● 運動</span><span>● 用藥</span><span>● 回診</span><span>● 症狀</span></p><button className="calendar-expand" disabled={disabled} aria-expanded={expanded} aria-controls="health-calendar-dates" onClick={()=>{if(!expanded)setMonth(date.slice(0,7));setExpanded(!expanded);}}>{expanded?'收合為一週 ↑':'展開月曆 ↓'}</button></section>;
}
