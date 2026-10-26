import StorageModeSettings from './StorageModeSettings';
import React from 'react';
import {KeyRound,Cloud,Database,RefreshCw,SlidersHorizontal} from 'lucide-react';
import ApiGuide from './ApiGuide';
export default function DemoSettings(){
 const sections=[{title:'Gemini API 與模型',Icon:KeyRound,text:'設定 API Key、一般分析模型與影片模型。啟用後可分析飲食照片、健檢文件及運動姿勢。'},{title:'Google Sheets／GAS',Icon:Cloud,text:'設定自己的 GAS 部署網址，選擇是否使用 Google Sheets 雲端同步。未設定仍可本機記錄。'},{title:'同步中心',Icon:RefreshCw,text:'檢查待同步項目、失敗原因及重試；也可從雲端載入資料。'},{title:'手機備份與還原',Icon:Database,text:'匯出本機備份檔，或選取備份檔還原健康紀錄。不需要 API 或 GAS。'},{title:'提醒與資料管理',Icon:SlidersHorizontal,text:'調整每日總結提醒、查看資料筆數與備份狀態。'}];
 return <><StorageModeSettings/><section className="demo-settings"><header><h2>其他系統設定</h2><p>你目前在示範模式。以下設定均保留，正式資料與連線設定需離開示範後操作。</p><a className="settings-open-real" href="/?view=settings">離開示範，開啟完整設定 →</a></header>{sections.map(({title,Icon,text})=><details key={title}><summary><Icon size={20}/><span>{title}</span><small>查看說明 ⌄</small></summary><p>{text}</p></details>)}<ApiGuide/></section></>;
}
