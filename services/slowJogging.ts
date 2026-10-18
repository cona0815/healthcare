export interface JogSession {id:string;elapsed:number;startedAt:number|null;target:number;saved:boolean;}
export const elapsedMs=(s:JogSession,now=Date.now())=>Math.min(s.target,Math.max(0,s.elapsed+(s.startedAt===null?0:Math.max(0,now-s.startedAt))));
export const videoError=(size:number,type:string)=>size>3*1024*1024?'影片上限 3 MB，請先剪成短片或降低解析度。':!['video/mp4','video/webm','video/quicktime'].includes(type)?'請使用 MP4、WebM 或 MOV 影片。':'';
export function videoAnalysisError(status:number,detail=''){
 if(status===413)return '影片過大，請縮短或降低畫質。';
 if(status===429||/RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(detail))return 'Gemini 額度已用完或請求過於頻繁，請查看額度後再試。';
 if(status===401||status===403||/API.?key|UNAUTHENTICATED|PERMISSION_DENIED/i.test(detail))return 'Gemini 金鑰無效或權限不足，請至設定更新金鑰。';
 if(/model.*(not found|no longer available|not supported)|NOT_FOUND/i.test(detail))return '目前 AI 模型無法使用，請更新模型設定後再試。';
 return `分析未完成（HTTP ${status}），請稍後重試。`;
}
