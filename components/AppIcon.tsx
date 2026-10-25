import React from 'react';
type Kind='home'|'food'|'exercise'|'assistant'|'brand'|'legs'|'back';
export default function AppIcon({kind='brand',className='',size=24}:{kind?:Kind;className?:string;size?:number}){
 const shapes:Record<Kind,React.ReactNode>={
 brand:<><path className="icon-tint" d="M12 21C3 16 2 10 5 6c2-3 5-2 7 1 2-3 5-4 7-1 3 4 2 10-7 15Z"/><path d="M12 17V9m0 4c-4 0-5-3-5-3m5 1c4 0 5-3 5-3"/></>,
 home:<><path className="icon-tint" d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7M8 7l4-3 4 3"/></>,
 food:<><circle className="icon-tint" cx="12" cy="13" r="8"/><path d="M7 13h10M8 10c2-3 6-3 8 0M12 5c0-3 3-3 3-3M12 5C9 5 8 3 8 2"/></>,
 exercise:<><path className="icon-tint" d="m8 4 4 5 4 3 5 2v5H3v-5l4-2Z"/><path d="M3 16h18M11 10l-2 3m6-1-2 2"/></>,
 assistant:<><rect className="icon-tint" x="4" y="4" width="16" height="17" rx="4"/><path d="M8 2v4m8-4v4M4 9h16m-11 6 2 2 4-4"/></>,
 legs:<><path className="icon-tint" d="M7 3h10l-2 8 3 9h-5l-3-8-1 8H4l2-10Z"/></>,
 back:<><path className="icon-tint" d="m8 4 4 2 4-2 5 5-3 3-2-2v11H8V10l-2 2-3-3Z"/><path d="M12 9v8m-3-4h6"/></>
 };
 return <svg aria-hidden="true" className={`app-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{shapes[kind]}</svg>;
}
export const HomeIcon=(p:any)=><AppIcon {...p} kind="home"/>;
export const FoodIcon=(p:any)=><AppIcon {...p} kind="food"/>;
export const ExerciseIcon=(p:any)=><AppIcon {...p} kind="exercise"/>;
export const AssistantIcon=(p:any)=><AppIcon {...p} kind="assistant"/>;
