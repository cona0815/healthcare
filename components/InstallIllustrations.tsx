import React from 'react';

// 加到主畫面教學的示意圖。手繪 SVG，不依賴網路圖片，離線也看得到；橘色圈＝要點的位置。
const HL='#f07c1e';
const W=160,H=300;

function Phone({children,label}:{children:React.ReactNode;label:string}){
 return <svg className="install-art" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
  <rect x="1" y="1" width={W-2} height={H-2} rx="24" fill="#1d2126"/>
  <rect x="7" y="7" width={W-14} height={H-14} rx="18" fill="#ffffff"/>
  <rect x="58" y="12" width="44" height="10" rx="5" fill="#1d2126"/>
  <text x="20" y="21" fontSize="8" fill="#222" fontWeight="600">9:41</text>
  <g>{children}</g>
 </svg>;
}
const Tap=({x,y,r=13}:{x:number;y:number;r?:number})=><g><circle cx={x} cy={y} r={r} fill="none" stroke={HL} strokeWidth="3"/><circle cx={x} cy={y} r={r+5} fill="none" stroke={HL} strokeWidth="1.2" opacity=".55"/></g>;
const Box=({x,y,w,h,r=7}:{x:number;y:number;w:number;h:number;r?:number})=><g><rect x={x-2} y={y-2} width={w+4} height={h+4} rx={r+2} fill="none" stroke={HL} strokeWidth="3"/><rect x={x-6} y={y-6} width={w+12} height={h+12} rx={r+5} fill="none" stroke={HL} strokeWidth="1.2" opacity=".55"/></g>;
const Txt=({x,y,s=9,c='#222',w=400,a='start',children}:{x:number;y:number;s?:number;c?:string;w?:number;a?:'start'|'middle'|'end';children:React.ReactNode})=><text x={x} y={y} fontSize={s} fill={c} fontWeight={w} textAnchor={a}>{children}</text>;
const AppIcon=({x,y,size=30}:{x:number;y:number;size?:number})=><g transform={`translate(${x} ${y})`}>
 <rect width={size} height={size} rx={size*.24} fill="#2f7459"/>
 <path transform={`translate(${size/2} ${size*.56}) scale(${size/30})`} d="M0 7 C-9 0 -10 -6 -5.5 -8 C-3 -9 -1 -7.5 0 -5.5 C1 -7.5 3 -9 5.5 -8 C10 -6 9 0 0 7Z" fill="#fff"/>
 <path transform={`translate(${size/2} ${size*.56}) scale(${size/30})`} d="M0 -5.5 C0 -10 3 -12 6 -12" stroke="#fff" strokeWidth="1.6" fill="none"/>
</g>;
// 健康日常頁面的縮影：標題列＋幾張卡片
const PageSketch=({top=34,bottom=250}:{top?:number;bottom?:number})=><g>
 <rect x="7" y={top} width={W-14} height="26" fill="#f4f7f1"/><AppIcon x={14} y={top+4} size={18}/><Txt x={38} y={top+17} s={9} w={700}>健康日常</Txt>
 {[0,1,2].map(i=>{const y=top+34+i*((bottom-top-40)/3);return <rect key={i} x="16" y={y} width={W-32} height={(bottom-top-40)/3-8} rx="7" fill={i===0?'#24503f':'#eef2ea'}/>;})}
</g>;

// ---------- iPhone ----------
export const IosStep1=()=><Phone label="在 LINE 裡點頁面上的「用 Safari 開啟」">
 <rect x="7" y="26" width={W-14} height="20" fill="#f6f6f6"/><Txt x={16} y={40} s={10}>✕</Txt><Txt x={80} y={40} s={8.5} a="middle" w={600}>健康日常</Txt><Txt x={144} y={40} s={10} a="end">⋯</Txt>
 <rect x="14" y="54" width={W-28} height="56" rx="9" fill="#fff4e8" stroke="#f3c79c"/>
 <Txt x={22} y={70} s={8} w={700} c="#7a4410">在 LINE 裡無法加到主畫面</Txt>
 <rect x="22" y="78" width="66" height="22" rx="6" fill="#2f7459"/><Txt x={55} y={93} s={8.5} c="#fff" a="middle" w={700}>用 Safari 開啟</Txt>
 <Box x={22} y={78} w={66} h={22} r={6}/>
 <PageSketch top={118} bottom={262}/>
 <rect x="7" y="264" width={W-14} height="29" fill="#f6f6f6"/><Txt x={30} y={282} s={11} c="#999">‹</Txt><Txt x={58} y={282} s={11} c="#999">›</Txt><Txt x={104} y={282} s={10} c="#666">⇪</Txt><Txt x={132} y={282} s={10} c="#666">⋯</Txt>
</Phone>;

export const IosStep2=()=><Phone label="在 Safari 點右下角「⋯」再點「分享」">
 <PageSketch top={30} bottom={200}/>
 <rect x="62" y="186" width="88" height="62" rx="12" fill="#f2f2f5" stroke="#dcdce2"/>
 <Txt x={74} y={204} s={8.5}>⤒  分享</Txt><Txt x={74} y={222} s={8.5} c="#555">☆  加入書籤</Txt><Txt x={74} y={240} s={8.5} c="#555">⊕  新分頁</Txt>
 <Box x={68} y={191} w={76} h={16} r={5}/>
 <rect x="14" y="258" width={W-28} height="26" rx="13" fill="#f2f2f5"/><Txt x={24} y={275} s={11} c="#666">‹</Txt><Txt x={80} y={274} s={7.5} c="#555" a="middle">healthcona.netlify.app</Txt><Txt x={138} y={275} s={11} c="#222" a="middle" w={700}>⋯</Txt>
 <Tap x={138} y={271} r={10}/>
</Phone>;

export const IosStep3=()=><Phone label="分享選單往下滑，點「加入主畫面」">
 <rect x="7" y="26" width={W-14} height={H-33} fill="#d9d9de"/>
 <rect x="10" y="70" width={W-20} height="220" rx="14" fill="#f2f2f5"/>
 <AppIcon x={18} y={80} size={22}/><Txt x={46} y={89} s={8.5} w={700}>健康日常</Txt><Txt x={46} y={100} s={7} c="#777">healthcona.netlify.app</Txt>
 {['拷貝','加入閱讀列表','加入書籤','加入主畫面','標示為喜好項目'].map((t,i)=>{const y=118+i*30;const on=t==='加入主畫面';return <g key={t}><rect x="16" y={y} width={W-32} height="24" rx="7" fill={on?'#fff':'#fafafa'}/><Txt x={26} y={y+16} s={8.5} w={on?700:400}>{t}</Txt><Txt x={W-26} y={y+16} s={9} a="end" c="#555">{on?'⊞':'›'}</Txt></g>;})}
 <Box x={16} y={208} w={W-32} h={24} r={7}/>
</Phone>;

export const IosStep4=()=><Phone label="確認「以網頁 App 打開」是開啟的，點右上角「加入」">
 <rect x="7" y="26" width={W-14} height={H-33} fill="#f2f2f5"/>
 <Txt x={18} y={46} s={8.5} c="#2a6fdb">取消</Txt><Txt x={80} y={46} s={8.5} a="middle" w={700}>加入主畫面</Txt><Txt x={142} y={46} s={8.5} a="end" c="#2a6fdb" w={700}>加入</Txt>
 <Tap x={131} y={43} r={12}/>
 <rect x="14" y="60" width={W-28} height="58" rx="10" fill="#fff"/><AppIcon x={22} y={68} size={40}/><Txt x={70} y={84} s={9} w={700}>健康日常</Txt><line x1="70" y1="90" x2="138" y2="90" stroke="#ddd"/><Txt x={70} y={104} s={6.5} c="#888">healthcona.netlify.app</Txt>
 <rect x="14" y="128" width={W-28} height="30" rx="10" fill="#fff"/><Txt x={22} y={147} s={8.5}>以網頁 App 打開</Txt>
 <rect x="110" y="135" width="30" height="17" rx="8.5" fill="#34c759"/><circle cx="131" cy="143.5" r="7" fill="#fff"/>
 <Txt x={18} y={178} s={7.5} c="#777">名稱可以改，預設是「健康日常」。</Txt>
 <Txt x={18} y={192} s={7.5} c="#777">這個開關要保持綠色（開啟）。</Txt>
</Phone>;

export const HomeScreen=({label}:{label:string})=><Phone label={label}>
 <rect x="7" y="26" width={W-14} height={H-33} fill="#7fa7c9"/>
 {Array.from({length:12}).map((_,i)=>{const col=i%4,row=Math.floor(i/4);const x=18+col*33,y=44+row*48;return i===6?null:<g key={i}><rect x={x} y={y} width="26" height="26" rx="6" fill={['#f6c445','#e8615a','#5cb85c','#5b8def','#c879d9','#f39a4c','#4bb5c4','#9aa0a6','#ef7aa5','#7bc67e','#6c7ae0','#f0a94b'][i]}/><rect x={x+3} y={y+30} width="20" height="4" rx="2" fill="#ffffff99"/></g>;})}
 <AppIcon x={84} y={92} size={26}/><Txt x={97} y={128} s={7} c="#fff" a="middle" w={700}>健康日常</Txt>
 <Tap x={97} y={105} r={17}/>
 <rect x="18" y="250" width={W-36} height="34" rx="12" fill="#ffffff55"/>
</Phone>;

// ---------- Android ----------
export const AndroidStep1=()=><Phone label="在 LINE 裡點頁面上的「用 Chrome 開啟」">
 <rect x="7" y="26" width={W-14} height="22" fill="#f6f6f6"/><Txt x={16} y={41} s={10}>✕</Txt><Txt x={30} y={41} s={8.5} w={600}>健康日常</Txt><Txt x={146} y={41} s={11} a="end">⋮</Txt>
 <rect x="14" y="56" width={W-28} height="56" rx="9" fill="#fff4e8" stroke="#f3c79c"/>
 <Txt x={22} y={72} s={8} w={700} c="#7a4410">在 LINE 裡無法加到主畫面</Txt>
 <rect x="22" y="80" width="70" height="22" rx="6" fill="#2f7459"/><Txt x={57} y={95} s={8.5} c="#fff" a="middle" w={700}>用 Chrome 開啟</Txt>
 <Box x={22} y={80} w={70} h={22} r={6}/>
 <PageSketch top={120} bottom={286}/>
</Phone>;

export const AndroidStep2=()=><Phone label="在 Chrome 點右上角「⋮」">
 <rect x="7" y="26" width={W-14} height="26" fill="#f1f3f4"/><rect x="14" y="31" width="112" height="16" rx="8" fill="#fff"/><Txt x={22} y={42} s={7.5} c="#555">healthcona.netlify.app</Txt><Txt x={142} y={44} s={13} a="middle" w={700}>⋮</Txt>
 <Tap x={142} y={39} r={11}/>
 <PageSketch top={56} bottom={286}/>
</Phone>;

export const AndroidStep3=()=><Phone label="選單裡點「安裝應用程式」或「加到主畫面」">
 <PageSketch top={30} bottom={286}/>
 <rect x="48" y="30" width="106" height="196" rx="8" fill="#fff" stroke="#ddd"/>
 {['新增分頁','書籤','記錄','分享…','安裝應用程式','桌面版網站'].map((t,i)=>{const y=40+i*30;const on=i===4;return <g key={t}>{on&&<rect x="52" y={y} width="98" height="24" rx="6" fill="#fff4e8"/>}<Txt x={60} y={y+16} s={8.5} w={on?700:400}>{t}</Txt></g>;})}
 <Box x={52} y={160} w={98} h={24} r={6}/>
 <Txt x={52} y={242} s={6.8} c="#666">名稱依版本不同，也可能是</Txt><Txt x={52} y={254} s={6.8} c="#666">「加到主畫面」或</Txt><Txt x={52} y={266} s={6.8} c="#666">「安裝並建立捷徑」</Txt>
</Phone>;

export const AndroidStep4=()=><Phone label="跳出視窗後點「安裝」">
 <rect x="7" y="26" width={W-14} height={H-33} fill="#00000055"/>
 <rect x="16" y="104" width={W-32} height="104" rx="14" fill="#fff"/>
 <Txt x={28} y={126} s={9.5} w={700}>安裝應用程式</Txt>
 <AppIcon x={28} y={136} size={26}/><Txt x={62} y={148} s={8.5} w={700}>健康日常</Txt><Txt x={62} y={160} s={6.5} c="#777">healthcona.netlify.app</Txt>
 <Txt x={84} y={194} s={8.5} c="#2a6fdb" a="middle">取消</Txt><Txt x={124} y={194} s={8.5} c="#2a6fdb" a="middle" w={700}>安裝</Txt>
 <Tap x={124} y={191} r={13}/>
</Phone>;
