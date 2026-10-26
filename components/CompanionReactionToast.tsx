import React,{useSyncExternalStore} from 'react';
import {actionCopy,companionReactions} from '../services/companionReactions';
import {UserProfile} from '../types';
import {PixelPerson} from './Companion';
export const useCompanionReaction=()=>useSyncExternalStore(companionReactions.subscribe,companionReactions.getSnapshot,()=>null);
export default function CompanionReactionToast({profile}:{profile:UserProfile}){
 const reaction=useCompanionReaction(),c=profile.companion;
 if(!reaction||!c||reaction.preview)return null;
 const copy=actionCopy[reaction.kind];
 return <aside className="companion-reaction-toast" aria-label="人物互動回應"><PixelPerson settings={c} profile={profile}/><div role="status" aria-live="polite"><small>{reaction.preview?'試看動作 · 不會新增紀錄':`${c.name} 收到紀錄了`}</small><strong>{copy.title}</strong><p>{copy.text}</p></div><button aria-label="關閉人物回應" onClick={companionReactions.clear}>×</button></aside>;
}
