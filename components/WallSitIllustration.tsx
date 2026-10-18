import React from 'react';
export function ExerciseArtwork({panel,caption}:{panel:number;caption:string}){
 const bottom=panel>=3;
 return <figure className="wall-technique-figure"><div role="img" aria-label={caption} style={{width:'100%',aspectRatio:bottom?'512 / 550':'512 / 466',backgroundImage:'url(/images/exercises/exercise-illustrations-v1.png)',backgroundSize:'300% auto',backgroundPosition:`${(panel%3)*50}% ${bottom?'100%':'0%'}`,backgroundRepeat:'no-repeat',borderRadius:12}}/><figcaption>{caption}<span>動作插畫示意，依自己的活動範圍調整</span></figcaption></figure>;
}
const panels=[0,1,3,3,4];
const captions=['側面：背部靠牆，雙腳站穩','正面：膝蓋大致隨腳尖方向','深度示意：依能力調整，不強求相同角度','穩定維持，肩頸自然放鬆','固定手機，拍攝完整身體與牆面'];
export default function WallSitIllustration({step}:{step:number}){return <ExerciseArtwork panel={panels[step]} caption={captions[step]}/>;}
