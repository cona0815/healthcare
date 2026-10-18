import TeachingVideos from './TeachingVideos';
import React from 'react';
import ExerciseSequence from './ExerciseSequence';
import {ExerciseKind,EXERCISE_TITLES,ANKLE_CRITERIA,ANGEL_CRITERIA,BAND_CRITERIA} from '../services/exerciseKinds';
const content={
 band_wall_slide:{cards:[['面向牆與彈力帶','環狀彈力帶套在雙手腕附近，雙手輕向外撐開。選擇自己能控制的阻力，避免彈力帶滑落。'],['沿牆上舉','前臂靠近牆面，緩慢上滑；影片示範最高點輕離牆後伸，再回牆下降至 W 型。離牆本身不是錯誤，不強迫過頭或固定手距。'],['保持軀幹穩定','避免為了抬高手臂而明顯拱腰、後仰或伸頭；若肩頸緊繃，先縮小幅度或降低阻力。'],['拍攝方式','背面拍雙手腕、完整彈力帶與雙肩最高點；側面補拍腰背及牆面。彈力帶看不清楚時，該項不計分。']],sources:[['你提供的 TikTok 示範（後段）','https://www.tiktok.com/@2023x6x6xx6/video/7688654737146776840']],note:'依你描述的「雙手腕套帶、撐開後沿牆上舉」建立此版本。影片來源保留供對照；AI 只觀察可見動作，不能量測彈力帶張力或肌肉出力。'},
 seated_ankle:{cards:[['坐穩再開始','坐在穩固椅子上，軀幹自然穩定，雙腳可以接觸地面。'],['踮腳：抬腳跟','前腳掌留在地面，腳跟向上抬起，再受控放下；不要以提起整條腿取代腳踝動作。'],['勾腳：抬腳尖','腳跟留在地面，腳尖往上勾，再放回。可與踮腳分開練習，不必同時做。'],['拍攝與評分','側面錄到椅子、膝蓋、鞋頭、鞋跟與地面。只拍踮腳時，勾腳項目會標示無法判斷，不扣分。']],sources:[['健康早知道・支群甫教官：坐姿踮腳＋勾腳','https://www.youtube.com/watch?v=VkwfTEhwFfY']],note:'影片約 00:10 示範踮腳、00:50 示範勾腳。計時長度由你設定；姿勢分數不代表血糖變化，也不能用來調整用藥。'},
 wall_angel:{cards:[['面向牆站立','掌心朝牆，雙手放在牆上；保持自然站姿，避免為了抬高手臂而明顯後仰。'],['手臂上滑與返回','沿牆向上滑到能控制的位置。影片包含手臂輕離牆、沿弧線下放的做法，這一階段離牆本身不是錯誤。'],['門柱／W 型變式','影片後段示範彎肘的門柱姿勢，再向上滑動。選擇適合自己的幅度，不強迫手臂到固定角度。'],['拍攝與評分','從背面拍雙肩與雙手完整軌跡，側面補拍腰背及牆面。若背面拍攝，角度請選「混合／不確定」。']],sources:[['找回活力：牆壁天使與門柱變式','https://www.youtube.com/shorts/D1zQ_e8BYD4']],note:'面向牆版本與背靠牆雪天使分開比較。畫面無法量測肩胛肌肉是否出力，AI 只觀察動作與可見代償。'},
 snow_angel:{cards:[['背靠牆準備','背部自然靠牆，雙腳站穩，膝蓋可微彎。不要為了貼牆而硬壓頭頸或過度拱腰。'],['緩慢上舉再返回','手背朝牆，由身側或 W 型起始，沿牆緩慢上舉再放下；選擇可控制的範圍。'],['注意腰背與肩頸','若抬手時明顯拱腰、頭往前伸或身體離牆，先縮小幅度。手腕或手肘不能貼牆時，不必硬推。'],['拍攝與評分','正面拍雙臂與最高點，側面補拍頭頸、腰背與牆面。看不到接觸處時，接觸項目會標示無法判斷。']],sources:[['MGA筋鏈康刮痧：雪天使上背訓練','https://www.youtube.com/watch?v=CpskSdJqo80'],['背靠牆上舉：補充示範','https://www.youtube.com/shorts/VZdDte2xYsA']],note:'第二支補充影片包含背靠牆滑臂與面向牆 W 型動作，請依本次練習選擇專區；不把不同站向的結果混在一起比較。'}
} as const;
export default function AssistedTechnique({exercise}:{exercise:Exclude<ExerciseKind,'jog'|'wall_sit'>}){
 const data=content[exercise],criteria=exercise==='seated_ankle'?ANKLE_CRITERIA:exercise==='band_wall_slide'?BAND_CRITERIA:ANGEL_CRITERIA;
 return <><section className="care-panel"><h2>{EXERCISE_TITLES[exercise]}動作要點</h2><ExerciseSequence exercise={exercise}/><details><summary>動作重點與拍攝方式</summary><div className="jog-finding-grid">{data.cards.map(([title,text],index)=><article className="jog-finding" key={title}><h3>{title}</h3><p>{text}</p></article>)}</div></details><p className="care-muted">{data.note}</p><details><summary>這個動作評哪些項目？</summary><ul>{criteria.map(c=><li key={c.id}>{c.title}</li>)}</ul><p>每項包含觀察時間、問題位置、改善或補拍建議；看不到的部分不計分。出現疼痛或不適時先停止。</p></details></section><TeachingVideos videos={data.sources}/></>;
}
