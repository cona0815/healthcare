import {test} from 'node:test';
import assert from 'node:assert/strict';
import {localDate,trendRows} from '../services/healthSummary';
test('calendar date uses local date parts',()=>{const d=new Date(2026,9,18,0,30);assert.equal(localDate(d),'2026-10-18');});
test('trend includes missing days and averages only fasting glucose',()=>{const rows=trendRows(7,[{id:'1',date:'2026-10-18',time:'08:00',type:'blood_sugar',bloodSugar:90,bloodSugarContext:'fasting'},{id:'2',date:'2026-10-18',time:'09:00',type:'blood_sugar',bloodSugar:110,bloodSugarContext:'fasting'},{id:'3',date:'2026-10-18',time:'12:00',type:'blood_sugar',bloodSugar:180,bloodSugarContext:'postprandial'}],[],{height:'',weight:''},new Date(2026,9,18,12));assert.equal(rows.length,7);assert.equal(rows[0].bloodSugar,null);assert.equal(rows[6].bloodSugar,100);assert.equal(rows[6].measured,true);});
test('range crosses month boundary without missing days',()=>{const rows=trendRows(30,[],[],{height:'',weight:''},new Date(2026,9,1,12));assert.equal(rows[0].date,'2026-09-02');assert.equal(rows[29].date,'2026-10-01');assert.equal(new Set(rows.map(r=>r.date)).size,30);});
