import React from 'react';
import ExerciseSequence from './ExerciseSequence';
import {JOG_TECHNIQUE} from '../services/jogTechnique';
export default function JogTechnique(){return <section className="care-panel"><h2>原地超慢跑：動作要點</h2><ExerciseSequence exercise="jog"/><details><summary>詳細要點與常見錯誤</summary><p className="care-muted">依你提供的 videoplayback.mp4 字幕與動作整理。時間為原片位置；影片有刻意示範錯誤，請搭配下列說明。</p><div className="jog-finding-grid">{JOG_TECHNIQUE.map(t=><article className="jog-finding" key={t.id}><header><h3>{t.title}</h3><span>{t.time}</span></header><dl><dt>練習提示</dt><dd>{t.cue}</dd><dt>常見錯誤</dt><dd>{t.mistake}</dd><dt>怎麼調整</dt><dd>{t.action}</dd></dl></article>)}</div></details><p className="care-muted mt-3">這些要點是教學參考。姿勢分析仍需清楚的側面影像；固定步頻、精確關節角度與足底受力不會直接當成合格依據。</p></section>;}
