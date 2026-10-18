import {EXERCISE_TITLES} from '../services/exerciseKinds';
import React,{useRef,useState,useId} from 'react';
import {ChevronLeft,ChevronRight,MoveHorizontal} from 'lucide-react';
import './exerciseSequence.css';
const defaultStages=['準備','動作中','返回'];
const instructions={
 jog:['自然站穩，視線向前，肩膀放鬆，雙手輕鬆彎曲。','用很小的步幅輕柔交替跑，腳落在重心附近；不刻意墊腳尖或抬高膝蓋。','腳步輕柔回到地面，接著換腳；不追求固定步頻，以舒適自然為主。'],
 seated_ankle:['坐穩於椅子，雙腳平放地面，軀幹自然穩定。','前腳掌留地，腳跟緩慢抬起再放下；不要把整條腿提起。','腳跟留地，腳尖往上勾再放回；與踮腳是兩種動作，可分開練習。'],
 wall_angel:['面向牆，掌心朝牆，手肘自然彎曲，雙腳站穩。','雙手沿牆緩慢上滑，保持軀幹穩定，不為了抬高手臂而後仰。','慢慢回到彎肘姿勢。輕離牆再沿弧線下放也是教學變式，不必硬貼牆。'],
 snow_angel:['背部自然靠牆，手背朝牆，雙臂舒適彎曲；不硬壓頭頸。','雙手緩慢向上滑到可控制的範圍，不強迫手肘、手腕全貼牆或舉過頭。','受控放回 W 型，避免拱腰或伸頭代償；有不適時先停止。'],
 wall_sit:['背部自然靠牆，雙腳站穩、稍往前放，腳掌保持接地。','慢慢滑下到自己可控制的深度，膝蓋大致隨腳尖方向，肩頸放鬆並自然呼吸。','緩慢沿牆起身，雙腳保持站穩，不突然彈起；依自己的能力調整深度。'],
 band_wall_slide:['面向牆，彈力帶套在雙手腕附近；雙手輕向外撐開，前臂靠牆、手肘彎曲。','保持軀幹穩定，雙手緩慢沿牆上舉；只到能控制的位置。影片的最高點輕離牆後伸是可選變式。','若有後伸，先回牆，再受控下滑到 W 型準備姿勢；避免突然甩動或拱腰。']
};
export default function ExerciseSequence({exercise}:{exercise:keyof typeof instructions}){
 const [active,setActive]=useState(0),track=useRef<HTMLDivElement>(null),id=useId();
 const stages=exercise==='seated_ankle'?['準備','踮腳','勾腳']:defaultStages;
 const basic=exercise==='wall_sit'||exercise==='band_wall_slide',ankle=exercise==='seated_ankle';
 const bottom=exercise==='band_wall_slide'||ankle||exercise==='snow_angel';
 const asset=basic?'exercise-sequences-ink-v2.png':exercise==='jog'||ankle?'jog-ankle-sequences-ink-v2.png':'angel-sequences-ink-v2.png';
 const height=basic?(bottom?592:428):(bottom?534:488);
 const go=(index:number)=>track.current?.scrollTo({left:index*track.current.clientWidth,behavior:'smooth'});
 return <div className="exercise-sequence" role="region" aria-roledescription="輪播" aria-label="三階段動作教學"><div className="sequence-hint"><MoveHorizontal size={16}/><span>左右滑動看動作</span><span aria-live="polite">{active+1} / 3</span></div><div className="sequence-stages">{stages.map((stage,i)=><button key={stage} aria-current={active===i?'step':undefined} aria-controls={id} onClick={()=>go(i)}>{String(i+1).padStart(2,'0')} {stage}</button>)}</div><div id={id} className="sequence-track" ref={track} tabIndex={0} onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();go(Math.max(0,Math.min(2,active+(e.key==='ArrowRight'?1:-1))));}}} onScroll={e=>setActive(Math.max(0,Math.min(2,Math.round(e.currentTarget.scrollLeft/e.currentTarget.clientWidth))))}>{stages.map((stage,i)=><article key={stage} className="sequence-slide" aria-label={`${i+1}/3 ${stage}`}><div role="img" aria-label={`${EXERCISE_TITLES[exercise]}：${stage}姿勢示意`} className="sequence-art" style={{aspectRatio:`512/${height}`,backgroundImage:`url(/images/exercises/${asset})`,backgroundPosition:`${exercise==='jog'&&i===2?0:i*50}% ${bottom?'100%':'0%'}`}}/><div className="sequence-caption"><h3>{stage}</h3><p>{instructions[exercise][i]}</p></div></article>)}</div><div className="sequence-controls"><button aria-label="上一張動作圖" disabled={active===0} onClick={()=>go(active-1)}><ChevronLeft size={18}/>上一張</button><span>插畫示意 · 不強求固定角度</span><button aria-label="下一張動作圖" disabled={active===2} onClick={()=>go(active+1)}>下一張<ChevronRight size={18}/></button></div></div>;
}
