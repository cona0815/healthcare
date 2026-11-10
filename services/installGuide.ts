// 「加到手機主畫面」教學用的環境偵測、LINE 外開網址與 Android 安裝提示。
export type InstallOs='ios'|'android'|'other';
export type InstallEnv={inLine:boolean;os:InstallOs;standalone:boolean};

type NavLike={userAgent:string;maxTouchPoints?:number;standalone?:boolean};
export function detectInstallEnv(nav:NavLike=navigator as NavLike,matchMedia?:(q:string)=>{matches:boolean}):InstallEnv{
 const ua=nav.userAgent||'';
 const ios=/iPhone|iPad|iPod/i.test(ua)||(/Macintosh/i.test(ua)&&(nav.maxTouchPoints||0)>1);
 const os:InstallOs=ios?'ios':/Android/i.test(ua)?'android':'other';
 const mm=matchMedia??(typeof window!=='undefined'&&window.matchMedia?window.matchMedia.bind(window):undefined);
 const standalone=nav.standalone===true||!!mm?.('(display-mode: standalone)').matches;
 return {inLine:/\bLine\/\d/i.test(ua),os,standalone};
}

/** LINE 支援在網址加 openExternalBrowser=1，點了會改用 Safari／Chrome 開啟；同時帶 install=1 讓外部瀏覽器直接打開教學。 */
export function externalBrowserUrl(href:string){
 const url=new URL(href);
 url.searchParams.set('openExternalBrowser','1');
 url.searchParams.set('view','settings');
 url.searchParams.set('install','1');
 return url.toString();
}

/** 網址裡一次性的參數用過就拿掉，避免「加入主畫面」把 ?view=settings 等存進主畫面圖示。 */
export const ONE_TIME_PARAMS=['openExternalBrowser','install','view'] as const;
export function cleanedUrl(href:string){
 const url=new URL(href);
 for(const key of ONE_TIME_PARAMS)url.searchParams.delete(key);
 return url.pathname+(url.search||'')+url.hash;
}

let guideRequested=typeof location!=='undefined'&&new URLSearchParams(location.search).get('install')==='1';
export function requestInstallGuide(){guideRequested=true;if(typeof window!=='undefined')window.dispatchEvent(new Event('health-open-install-guide'));}
export function takeInstallGuideRequest(){const v=guideRequested;guideRequested=false;return v;}

const DISMISS_KEY='hg_install_hint_dismissed';
export function lineHintDismissed(storage:Pick<Storage,'getItem'>=localStorage){try{return storage.getItem(DISMISS_KEY)==='1';}catch{return false;}}
export function dismissLineHint(storage:Pick<Storage,'setItem'>=localStorage){try{storage.setItem(DISMISS_KEY,'1');}catch{}}

// Android Chrome：符合安裝條件時會發 beforeinstallprompt，要在一開始就接住，之後才能讓使用者一鍵安裝。
type InstallPromptEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
let deferred:InstallPromptEvent|null=null;
export function initInstallPrompt(){
 if(typeof window==='undefined')return;
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e as InstallPromptEvent;window.dispatchEvent(new Event('health-install-available'));});
 window.addEventListener('appinstalled',()=>{deferred=null;window.dispatchEvent(new Event('health-install-available'));});
}
export const canPromptInstall=()=>!!deferred;
export async function promptInstall():Promise<'accepted'|'dismissed'|'unavailable'>{
 if(!deferred)return 'unavailable';
 const event=deferred;deferred=null;
 await event.prompt();
 const {outcome}=await event.userChoice;
 window.dispatchEvent(new Event('health-install-available'));
 return outcome;
}
