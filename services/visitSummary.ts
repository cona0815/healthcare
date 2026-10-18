import { FoodAnalysis, UserProfile, VitalsRecord, WorkoutLog } from '../types';
import { localDate } from './healthSummary';
export function visitSummary(profile:UserProfile,vitals:VitalsRecord[],foods:FoodAnalysis[],workouts:WorkoutLog[],from:string,to:string) {
 const inRange=(date:string)=>date>=from&&date<=to;
 const lines=[`看診摘要 · ${profile.name||'未填姓名'}`,`${from} 至 ${to}`, '資料來源：使用者自行記錄；缺漏代表未記錄。', '', '生理量測'];
 const vs=vitals.filter(v=>inRange(v.date)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 lines.push(...(vs.length?vs.map(v=>`${v.date} ${v.time}  ${v.type==='blood_pressure'?`血壓 ${v.systolic??'—'}/${v.diastolic??'—'} mmHg；脈搏 ${v.pulse??'—'}`:`血糖 ${v.bloodSugar??'—'} mg/dL（${{fasting:'空腹',postprandial:'飯後',random:'隨機'}[v.bloodSugarContext||'random']}）`}${v.notes?'；'+v.notes:''}`):['此區間無量測紀錄']));
 lines.push('', '體重');
 lines.push(...((profile.weightHistory||[]).filter(w=>inRange(w.date)).map(w=>`${w.date}  ${w.weight} kg`)), '', '用藥設定（目前設定，非歷史處方）');
 lines.push(...((profile.medicationReminders||[]).map(m=>`${m.time}  ${m.name}`)), '', '已勾選服藥紀錄');
 const meds=(profile.dailyHealthLogs||[]).filter(d=>inRange(d.date)&&d.medicationsTaken?.length).map(d=>`${d.date}  ${d.medicationsTaken!.map(id=>profile.medicationReminders?.find(m=>m.id===id)?.name||'已移除的用藥提醒').join('、')}`);
 lines.push(...(meds.length?meds:['此區間無服藥勾選紀錄']), '', '症狀與當日飲食／用藥');
 const symptoms=(profile.symptoms||[]).filter(s=>inRange(localDate(s.occurredAt))).sort((a,b)=>a.occurredAt.localeCompare(b.occurredAt));
 for(const s of symptoms){const date=localDate(s.occurredAt);lines.push(`${s.occurredAt.replace('T',' ')}  ${s.symptom}；程度 ${s.severity}/10`,s.notes||'無補充說明',`當日飲食：${foods.filter(f=>localDate(f.timestamp)===date).map(f=>f.foodName).join('、')||'未記錄'}`,`當日服藥：${meds.find(m=>m.startsWith(date))||'未記錄'}`);}
 if(!symptoms.length)lines.push('此區間無症狀紀錄');
 lines.push('', '運動');lines.push(...workouts.filter(w=>inRange(localDate(w.timestamp))).map(w=>`${localDate(w.timestamp)}  ${w.activity} ${w.duration} 分鐘`));
 return lines;
}
// Image-based PDF embeds locally rendered Chinese glyphs, without uploading health data or fetching fonts.
export async function downloadSummaryPdf(lines:string[],filename:string) {
 await document.fonts.ready;
 const width=1240,height=1754,margin=90,lineHeight=42;
 const canvases:HTMLCanvasElement[]=[];
 let canvas:HTMLCanvasElement,ctx:CanvasRenderingContext2D,y:number;
 function page(){canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;ctx=canvas.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,width,height);ctx.fillStyle='#173d37';ctx.font='26px "Microsoft JhengHei", "PingFang TC", sans-serif';y=100;canvases.push(canvas);}
 page();
 for(const line of lines){let chunk='';for(const ch of line){if(ctx!.measureText(chunk+ch).width>width-margin*2){if(y!>height-130)page();ctx!.fillText(chunk,margin,y!);y!+=lineHeight;chunk='';}chunk+=ch;}if(y!>height-130)page();ctx!.fillText(chunk,margin,y!);y!+=lineHeight;}
 const encoder=new TextEncoder(),chunks:Uint8Array[]=[],offsets:number[]=[0];let length=0;
 const push=(value:string|Uint8Array)=>{const bytes=typeof value==='string'?encoder.encode(value):value;chunks.push(bytes);length+=bytes.length;};
 const object=(id:number,body:string|Uint8Array[])=>{offsets[id]=length;push(`${id} 0 obj\n`);if(typeof body==='string')push(body);else body.forEach(push);push('\nendobj\n');};
 push('%PDF-1.4\n');object(1,'<< /Type /Catalog /Pages 2 0 R >>');object(2,`<< /Type /Pages /Count ${canvases.length} /Kids [${canvases.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`);
 canvases.forEach((c,i)=>{const context=c.getContext('2d')!;context.fillStyle='#687772';context.font='20px sans-serif';context.fillText(`HealthGuardian  |  ${i+1} / ${canvases.length}`,margin,height-65);const jpeg=Uint8Array.from(atob(c.toDataURL('image/jpeg',0.92).split(',')[1]),ch=>ch.charCodeAt(0));const id=3+i*3;object(id,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im${i} ${id+1} 0 R >> >> /Contents ${id+2} 0 R >>`);object(id+1,[encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),jpeg,encoder.encode('\nendstream')]);const content=`q 595 0 0 842 0 0 cm /Im${i} Do Q`;object(id+2,`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`);});
 const start=length;push(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);offsets.slice(1).forEach(n=>push(`${String(n).padStart(10,'0')} 00000 n \n`));push(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`);
 const blob=new Blob(chunks as BlobPart[],{type:'application/pdf'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();return url;
}
