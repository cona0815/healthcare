import React, {useState} from 'react';
import {GripVertical, ArrowUp, ArrowDown, Trash2, Plus} from 'lucide-react';
interface Props {items:string[];onSave:(items:string[])=>Promise<void>;}
export default function ExerciseOptions({items,onSave}:Props){
 const [open,setOpen]=useState(false);const [draft,setDraft]=useState<{id:string;name:string}[]>([]);const [error,setError]=useState('');const [saving,setSaving]=useState(false);
 const move=(id:string,targetId:string)=>setDraft(rows=>{const from=rows.findIndex(r=>r.id===id);const to=rows.findIndex(r=>r.id===targetId);if(from<0||to<0||from===to)return rows;const next=[...rows];const [item]=next.splice(from,1);next.splice(to,0,item);return next;});
 const begin=()=>{setDraft(items.map(name=>({id:crypto.randomUUID(),name})));setError('');setOpen(true);};
 return <div className="mt-3">
 {!open?<button type="button" onClick={begin} className="text-sm text-orange-700 underline py-2">自訂項目與排序</button>:<section aria-label="自訂運動選單" className="border rounded-xl p-3 bg-gray-50">
 <h4 className="font-bold mb-1">自訂運動選單</h4><p className="text-xs text-gray-500 mb-3">拖曳左側把手排序，或使用上下箭頭。修改僅影響選單，不會更動歷史紀錄。</p>
 <fieldset disabled={saving} className="space-y-2">
 {draft.map((row,index)=><div key={row.id} data-exercise-row={row.id} className="flex items-center gap-1 bg-white border rounded-lg p-1">
 <button type="button" aria-label={`拖曳${row.name||'項目'}排序`} style={{touchAction:'none',cursor:'grab',minWidth:36,minHeight:44}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(!e.currentTarget.hasPointerCapture(e.pointerId))return;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-exercise-row]')?.getAttribute('data-exercise-row');if(target)move(row.id,target);}} onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}><GripVertical size={18}/></button>
 <input aria-label={`運動名稱 ${index+1}`} maxLength={80} value={row.name} onChange={e=>{const name=e.target.value;setDraft(rows=>rows.map(r=>r.id===row.id?{...r,name}:r));}} className="min-w-0 flex-1 w-0 p-2 text-sm border rounded"/>
 <button type="button" aria-label={`上移${row.name}`} disabled={index===0} onClick={()=>move(row.id,draft[index-1].id)} className="p-2 min-h-11 disabled:opacity-25"><ArrowUp size={16}/></button>
 <button type="button" aria-label={`下移${row.name}`} disabled={index===draft.length-1} onClick={()=>move(row.id,draft[index+1].id)} className="p-2 min-h-11 disabled:opacity-25"><ArrowDown size={16}/></button>
 <button type="button" aria-label={`刪除${row.name}`} onClick={()=>setDraft(rows=>rows.filter(r=>r.id!==row.id))} className="p-2 min-h-11 text-red-600"><Trash2 size={16}/></button>
 </div>)}
 <button type="button" onClick={()=>setDraft(rows=>[...rows,{id:crypto.randomUUID(),name:''}])} className="flex items-center gap-1 py-3 text-sm"><Plus size={17}/>新增運動項目</button>
 <div className="flex gap-2"><button type="button" className="bg-orange-600 text-white rounded-lg px-4 py-3 text-sm" onClick={async()=>{const names=draft.map(r=>r.name.trim());if(names.some(n=>!n)){setError('請填寫每個運動名稱，或刪除空白項目。');return;}if(names.includes('custom')||new Set(names.map(n=>n.toLowerCase())).size!==names.length){setError('名稱不能重複，也不能使用保留名稱 custom。');return;}setSaving(true);setError('');try{await onSave(names);setOpen(false);}catch{setError('儲存失敗，修改仍保留，請重試。');}finally{setSaving(false);}}}>{saving?'儲存中…':'儲存選單'}</button><button type="button" onClick={()=>setOpen(false)} className="px-4 py-3 text-sm">取消</button></div>
 </fieldset>{error&&<p role="alert" className="text-red-600 text-sm mt-2">{error}</p>}
 </section>}
 </div>;
}
