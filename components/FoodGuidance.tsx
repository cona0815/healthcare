import React from 'react';
import {UserProfile} from '../types';
import {foodGuides} from '../services/foodGuidance';
import AppIcon from './AppIcon';
export default function FoodGuidance({profile,onEdit}:{profile:UserProfile;onEdit:()=>void}){
 const guides=foodGuides(profile.medicalConditions,profile.allergies);
 return <details className="food-guidance"><summary><AppIcon kind="food"/><span>我的飲食指南<small>依已填寫病史・免 API</small></span><span aria-hidden="true">⌄</span></summary><div className="guidance-body"><p>目前病史：{profile.medicalConditions?.join('、')||'尚未填寫'}</p><button onClick={onEdit}>編輯病史與過敏 →</button>{guides.length?guides.map(g=><article key={g.title}><h3>{g.title}</h3><div className="food-prefer"><h4>優先選擇</h4><p>{g.prefer}</p></div><div className="food-limit"><h4>需要限制</h4><p>{g.limit}</p></div><p>{g.note}</p><a href={g.url} target="_blank" rel="noopener noreferrer">{g.source} ↗</a></article>):<p>{profile.medicalConditions?.length?'目前尚未涵蓋這些病症的飲食規則，請依醫師或營養師建議。':'先在個人資料填寫病史，這裡就會顯示對應的飲食方向。'}</p>}<small>一般衛教，不是個人飲食處方；目前涵蓋糖尿病、高血壓、高血脂與腎臟病提醒，尚未檢查藥物交互作用。多重病症、過敏或特殊營養需求，請由醫療團隊確認。來源查核：2026-10-25。</small></div></details>;
}
