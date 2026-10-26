import React,{useEffect,useRef} from 'react';
export default function DuplicateMealDialog({name,onChoose}:{name:string;onChoose:(add:boolean)=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{dialog.current?.showModal();},[]);
 return <dialog ref={dialog} className="meal-editor" onCancel={e=>{e.preventDefault();onChoose(false);}}><h2>這筆餐點可能重複</h2><p>剛才已記錄相似的「{name}」。如果確實又吃了一份，可以仍然新增。</p><div className="meal-editor-actions"><button onClick={()=>onChoose(false)}>取消新增</button><button onClick={()=>onChoose(true)}>仍然新增一筆</button></div></dialog>;
}
