export type CompanionAction='eat'|'drink'|'exercise'|'hello';
export const actionCopy={eat:{title:'開飯囉！',text:'這一餐記下來了，慢慢享用。',icon:'🍚'},drink:{title:'咕嚕，補充水分！',text:'飲水紀錄收到，陪你喝一口。',icon:'💧'},exercise:{title:'一起動起來！',text:'活動紀錄收到，辛苦了！',icon:'👟'},hello:{title:'嗨，我在這裡！',text:'今天也一起過日常。',icon:'💚'}};
export type CompanionReaction={kind:CompanionAction;serial:number;preview:boolean};
export function createReactionStore(duration=7000){
 let current:CompanionReaction|null=null,serial=0,timer:ReturnType<typeof setTimeout>|undefined;
 const listeners=new Set<()=>void>(),seen=new Set<string>();
 const notify=()=>listeners.forEach(fn=>fn());
 const clear=()=>{if(timer)clearTimeout(timer);timer=undefined;current=null;notify();};
 return {subscribe:(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};},getSnapshot:()=>current,clear,
 play:(kind:CompanionAction,id?:string,preview=false)=>{if(id&&seen.has(id))return false;if(id){seen.add(id);if(seen.size>200)seen.delete(seen.values().next().value!);}if(timer)clearTimeout(timer);current={kind,serial:++serial,preview};notify();timer=setTimeout(clear,duration);return true;}};
}
export const companionReactions=createReactionStore();
