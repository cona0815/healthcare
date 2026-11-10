import React,{useEffect,useRef,useState} from 'react';
import {Smartphone,ExternalLink,Copy,Download,X,AlertTriangle,BookOpen} from 'lucide-react';
import {detectInstallEnv,externalBrowserUrl,takeInstallGuideRequest,requestInstallGuide,canPromptInstall,promptInstall,lineHintDismissed,dismissLineHint,InstallOs} from '../services/installGuide';
import {IosStep1,IosStep2,IosStep3,IosStep4,HomeScreen,AndroidStep1,AndroidStep2,AndroidStep3,AndroidStep4} from './InstallIllustrations';
import './installGuide.css';

type Step={title:string;body:React.ReactNode;Art:React.FC};
const IOS_STEPS:Step[]=[
 {title:'先離開 LINE，改用 Safari 開啟',Art:IosStep1,body:<>LINE 裡的瀏覽器沒有「加入主畫面」。點本頁上方的<b>「用 Safari 開啟」</b>。如果沒看到這個按鈕，點 LINE 瀏覽器角落的選單（「⋯」或分享圖示），選<b>「使用 Safari 開啟」</b>，各版本名稱略有不同。</>},
 {title:'在 Safari 打開分享選單',Art:IosStep2,body:<>iOS 26 起：點網址列右邊的<b>「⋯」</b>，再點<b>「分享」</b>。較舊的 iOS：直接點畫面下方中間的<b>分享鈕</b>（方框加向上箭頭）。</>},
 {title:'點「加入主畫面」',Art:IosStep3,body:<>分享選單往上滑或往下捲，找到<b>「加入主畫面」</b>（旁邊是方框加號的圖示）。沒看到時，捲到最下面點「編輯動作」把它加回來。</>},
 {title:'確認後點「加入」',Art:IosStep4,body:<>名稱可以改。iOS 26 會有<b>「以網頁 App 打開」</b>開關，請保持開啟（綠色），這樣打開時是全螢幕、像一般 App。最後點右上角<b>「加入」</b>。</>},
 {title:'從主畫面打開',Art:()=><HomeScreen label="主畫面出現健康日常圖示"/>,body:<>主畫面會多一個綠色的<b>「健康日常」</b>圖示。之後都從這個圖示打開，不要再從 LINE 點連結，紀錄才會存在同一個地方。</>},
];
const ANDROID_STEPS:Step[]=[
 {title:'先離開 LINE，改用 Chrome 開啟',Art:AndroidStep1,body:<>LINE 裡的瀏覽器沒辦法安裝。點本頁上方的<b>「用 Chrome 開啟」</b>。如果沒看到這個按鈕，點 LINE 瀏覽器右上角<b>「⋮」</b>，選<b>「以其他應用程式開啟」</b>或<b>「用瀏覽器開啟」</b>，再選 Chrome。</>},
 {title:'點 Chrome 右上角「⋮」',Art:AndroidStep2,body:<>如果本頁出現<b>「一鍵安裝到主畫面」</b>按鈕，直接按它就好，可以跳到第 4 步。沒有的話，點 Chrome 網址列右邊的<b>「⋮」</b>。</>},
 {title:'點「安裝應用程式」',Art:AndroidStep3,body:<>Chrome 版本不同，名稱也不同：可能是<b>「安裝應用程式」</b>、<b>「加到主畫面」</b>或新版的<b>「安裝並建立捷徑」</b>，選其中一個。三星網際網路：點右下角「≡」→「新增頁面至」→「主螢幕」。</>},
 {title:'點「安裝」',Art:AndroidStep4,body:<>跳出視窗後點<b>「安裝」</b>。如果出現「安裝」和「建立捷徑」兩個選擇，選<b>「安裝」</b>，打開時才會是全螢幕。</>},
 {title:'從主畫面打開',Art:()=><HomeScreen label="主畫面或應用程式清單出現健康日常圖示"/>,body:<>主畫面（或應用程式清單）會多一個綠色的<b>「健康日常」</b>圖示，之後都從這裡打開。</>},
];

const openSettingsBackup=()=>document.getElementById('device-backup')?.scrollIntoView({behavior:'smooth',block:'start'});

export default function InstallGuide(){
 const env=detectInstallEnv();
 const [os,setOs]=useState<Exclude<InstallOs,'other'>>(env.os==='android'?'android':'ios');
 const [open,setOpen]=useState(false);
 const [canInstall,setCanInstall]=useState(canPromptInstall());
 const [message,setMessage]=useState('');
 const ref=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{
  const show=()=>{if(takeInstallGuideRequest()){setOpen(true);for(const ms of [150,700])setTimeout(()=>ref.current?.scrollIntoView({behavior:'auto',block:'start'}),ms);}};
  show();
  const avail=()=>setCanInstall(canPromptInstall());
  window.addEventListener('health-open-install-guide',show);window.addEventListener('health-install-available',avail);
  return()=>{window.removeEventListener('health-open-install-guide',show);window.removeEventListener('health-install-available',avail);};
 },[]);
 const browserName=os==='ios'?'Safari':'Chrome';
 const copyLink=async()=>{try{await navigator.clipboard.writeText(location.origin+'/');setMessage(`已複製網址，請打開 ${browserName} 貼上。`);}catch{setMessage(`請手動複製網址：${location.origin}/`);}};
 const install=async()=>{const outcome=await promptInstall();setMessage(outcome==='accepted'?'已開始安裝，完成後主畫面會出現「健康日常」。':outcome==='dismissed'?'已取消安裝，可以之後再按一次。':'這個瀏覽器目前不能一鍵安裝，請照下面步驟操作。');};
 const steps=os==='ios'?IOS_STEPS:ANDROID_STEPS;
 const status=env.standalone?'目前已從主畫面開啟 ✓':env.inLine?'你現在是在 LINE 裡開啟，需要先換到瀏覽器':env.os==='other'?'電腦上不需要；請用手機照步驟操作':`目前用${env.os==='ios'?' Safari 等瀏覽器':'瀏覽器'}開啟，照下面步驟加入`;
 return <details ref={ref} className="install-guide" open={open} onToggle={e=>setOpen((e.target as HTMLDetailsElement).open)}>
  <summary><Smartphone size={20}/><span><strong>加到手機主畫面</strong><small>{status}</small></span><em>{open?'收合':'圖文教學'}</em></summary>
  <div className="install-body">
   {env.inLine&&<div className="install-line-actions">
    <p>LINE 裡沒有「加到主畫面」，先換到 {browserName}：</p>
    <a className="install-primary" href={externalBrowserUrl(location.href)}><ExternalLink size={18}/>用 {browserName} 開啟</a>
    <button type="button" onClick={()=>void copyLink()}><Copy size={16}/>複製網址</button>
   </div>}
   {canInstall&&!env.standalone&&<button type="button" className="install-primary install-one-tap" onClick={()=>void install()}><Download size={18}/>一鍵安裝到主畫面</button>}
   {message&&<p role="status" className="install-message">{message}</p>}
   <div className="install-warning"><AlertTriangle size={18}/><div><strong>先備份再搬家</strong><p>紀錄存在「當初打開的地方」：LINE、Safari、Chrome 和主畫面 App 的資料彼此分開，<b>不會自動帶過去</b>。如果已經在 LINE 或瀏覽器記過資料，請先在原本的地方到<button type="button" className="install-link" onClick={openSettingsBackup}>「手機備份與還原」</button>下載備份檔，加到主畫面後，從新的圖示打開，再到同一個地方還原。</p></div></div>
   <div className="install-tabs" role="tablist" aria-label="手機系統">
    <button type="button" role="tab" aria-selected={os==='ios'} onClick={()=>setOs('ios')}>iPhone／iPad</button>
    <button type="button" role="tab" aria-selected={os==='android'} onClick={()=>setOs('android')}>Android 安卓</button>
   </div>
   <ol className="install-steps">
    {steps.map(({title,body,Art},i)=><li key={title}><Art/><div><h4><span>{i+1}</span>{title}</h4><p>{body}</p></div></li>)}
   </ol>
   {os==='ios'&&<p className="install-tip">小技巧：想讓 LINE 以後的連結都直接用 Safari 開，可到 LINE「主頁 → 設定 → LINE Labs」開啟「使用預設瀏覽器開啟連結」。選項名稱依 LINE 版本可能不同。</p>}
   <p className="install-tip">圖示是示意圖，實際畫面會依手機與 App 版本略有不同；橘色圈是要點的地方。</p>
  </div>
 </details>;
}

/** 設定頁上的「圖文使用說明」入口（public/guide/）。 */
export function GuideLink(){return <a className="guide-link" href="/guide/index.html" target="_blank" rel="noopener"><BookOpen size={18}/><span><strong>圖文使用說明</strong><small>每個功能怎麼用，一步一步看</small></span><em>開啟 ↗</em></a>;}

/** 只在 LINE 內建瀏覽器顯示的細長提示列，可關閉。 */
export function LineInstallHint({onShowGuide}:{onShowGuide:()=>void}){
 const env=detectInstallEnv();
 const [hidden,setHidden]=useState(lineHintDismissed());
 if(!env.inLine||env.standalone||hidden)return null;
 const browserName=env.os==='ios'?'Safari':'Chrome';
 return <div className="line-install-hint" role="note">
  <span>想加到主畫面？LINE 裡不行，請先用 {browserName} 開啟。</span>
  <a href={externalBrowserUrl(location.href)}>用 {browserName} 開啟</a>
  <button type="button" onClick={()=>{requestInstallGuide();onShowGuide();}}>怎麼做</button>
  <button type="button" aria-label="不再顯示" onClick={()=>{dismissLineHint();setHidden(true);}}><X size={16}/></button>
 </div>;
}
