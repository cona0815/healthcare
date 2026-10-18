export interface PosePoint {x:number;y:number;visibility?:number;}
export interface PoseMeasurement {time:number;coverage:number;leftKnee:number|null;rightKnee:number|null;leftElbow:number|null;rightElbow:number|null;trunk:number|null;}
export function jointAngle(a:PosePoint,b:PosePoint,c:PosePoint,width:number,height:number):number|null{
 if([a,b,c].some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||(p.visibility??0)<.65))return null;
 const ax=(a.x-b.x)*width,ay=(a.y-b.y)*height,cx=(c.x-b.x)*width,cy=(c.y-b.y)*height;
 const length=Math.hypot(ax,ay)*Math.hypot(cx,cy);if(length<1e-9)return null;
 return Math.round(Math.acos(Math.min(1,Math.max(-1,(ax*cx+ay*cy)/length)))*180/Math.PI);
}
export function measurePose(points:PosePoint[],width:number,height:number,time:number):PoseMeasurement{
 const visible=(i:number)=>points[i]&&(points[i].visibility??0)>=.65&&points[i].x>=0&&points[i].x<=1&&points[i].y>=0&&points[i].y<=1;
 const body=[11,12,13,14,15,16,23,24,25,26,27,28];
 const angle=(a:number,b:number,c:number)=>[a,b,c].every(visible)?jointAngle(points[a],points[b],points[c],width,height):null;
 let trunk:number|null=null;
 if([11,12,23,24].every(visible)){const sx=(points[11].x+points[12].x)/2,sy=(points[11].y+points[12].y)/2,hx=(points[23].x+points[24].x)/2,hy=(points[23].y+points[24].y)/2;const dx=(sx-hx)*width,dy=(hy-sy)*height;if(Math.hypot(dx,dy)>1)trunk=Math.round(Math.atan2(Math.abs(dx),dy)*180/Math.PI);}
 return {time,coverage:Math.round(body.filter(visible).length/body.length*100),leftKnee:angle(23,25,27),rightKnee:angle(24,26,28),leftElbow:angle(11,13,15),rightElbow:angle(12,14,16),trunk};
}
export function targetStatus(value:number|null,min:number,max:number){return value===null?'unknown':value>=min&&value<=max?'inside':Math.min(Math.abs(value-min),Math.abs(value-max))<=10?'near':'outside';}
