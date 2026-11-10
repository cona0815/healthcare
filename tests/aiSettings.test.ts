import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {getGeminiModel,saveGeminiModels,DEFAULT_GEMINI_MODEL,AUTO_MODEL,getGeminiPlan,setGeminiPlan,getModelPreference,saveModelPreferences,rankModels,autoCandidates,runWithModelFallback,GeminiError,classifyGeminiError,preferredModel,takePlanNotice,getLastGoodModel,cachedModels} from '../services/aiSettings';

const rows=new Map<string,string>();
beforeEach(()=>{rows.clear();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>rows.set(k,v),removeItem:(k:string)=>rows.delete(k)}});});

const quota=(model:string,message='RESOURCE_EXHAUSTED: You exceeded your current quota')=>new GeminiError(message,429,'RESOURCE_EXHAUSTED',model);
const missing=(model:string)=>new GeminiError(`models/${model} is not found for API version v1beta`,404,'NOT_FOUND',model);
const badKey=(model:string)=>new GeminiError('API key not valid. Please pass a valid API key.',400,'INVALID_ARGUMENT',model);
const noFetch:any=async()=>{throw new Error('不應該呼叫模型清單');};
const listFetch=(names:string[],calls:string[]=[])=>(async(url:string)=>{calls.push(url);return {ok:true,status:200,json:async()=>({models:names.map(n=>({name:`models/${n}`,methods:['generateContent']}))})} as any;}) as any;
/** 依「模型 → 結果或錯誤」表模擬 Google 回應，並記錄嘗試順序。 */
const scripted=(table:Record<string,unknown>,tried:string[]=[])=>async(model:string)=>{tried.push(model);const v=table[model];if(v instanceof Error)throw v;if(v===undefined)throw missing(model);return v;};

test('legacy helpers: display model defaults and explicit settings still validate',()=>{
 assert.equal(getGeminiModel(),DEFAULT_GEMINI_MODEL);
 saveGeminiModels('gemini-3.8-flash','gemini-3.6-flash');
 assert.equal(getGeminiModel('video'),'gemini-3.6-flash');
 assert.throws(()=>saveGeminiModels('not-a-model','gemini-3.8-flash'));
 assert.equal(getGeminiModel(),'gemini-3.8-flash');
});

test('default plan is free; auto order prefers Flash-Lite for free and Flash for paid, last good model first',()=>{
 assert.equal(getGeminiPlan(),'free');
 assert.equal(getModelPreference(),AUTO_MODEL);
 assert.deepEqual(autoCandidates('general','free'),['gemini-flash-lite-latest','gemini-flash-latest']);
 assert.deepEqual(autoCandidates('general','paid'),['gemini-flash-latest','gemini-flash-lite-latest']);
 localStorage.setItem('hg_gemini_last_good_general','gemini-4.2-flash-lite');
 assert.equal(autoCandidates('general','free')[0],'gemini-4.2-flash-lite');
 assert.equal(preferredModel('general','free'),'gemini-4.2-flash-lite');
 saveModelPreferences('gemini-9.9-flash',AUTO_MODEL);
 assert.equal(preferredModel('general','free'),'gemini-9.9-flash');
 assert.throws(()=>saveModelPreferences('custom-model',AUTO_MODEL));
});

test('rankModels keeps only stable flash / flash-lite names and sorts newest first within each tier',()=>{
 const names=['gemini-3.1-flash','gemini-3.5-flash-lite','gemini-3.8-flash','gemini-3.1-flash-lite','gemini-3.1-pro-preview','gemini-3.8-flash-preview','gemini-2.5-flash-image','gemini-2.5-flash-tts','embedding-001'];
 assert.deepEqual(rankModels(names,'free'),['gemini-3.5-flash-lite','gemini-3.1-flash-lite','gemini-3.8-flash','gemini-3.1-flash']);
 assert.deepEqual(rankModels(names,'paid'),['gemini-3.8-flash','gemini-3.1-flash','gemini-3.5-flash-lite','gemini-3.1-flash-lite']);
});

test('auto mode skips a deprecated model (404) and an exhausted one (429), then remembers the model that worked',async()=>{
 const tried:string[]=[];
 const table={'gemini-flash-lite-latest':missing('gemini-flash-lite-latest'),'gemini-flash-latest':quota('gemini-flash-latest'),'gemini-9.1-flash-lite':{text:'OK'}};
 const outcome=await runWithModelFallback('general',scripted(table,tried),{plan:'free',fetcher:listFetch(['gemini-9.1-flash-lite','gemini-9.1-flash','gemini-9.1-pro','gemini-9.1-flash-preview'])});
 assert.deepEqual(tried,['gemini-flash-lite-latest','gemini-flash-latest','gemini-9.1-flash-lite']);
 assert.equal(outcome.model,'gemini-9.1-flash-lite');
 assert.deepEqual(outcome.result,{text:'OK'});
 assert.equal(getLastGoodModel('general'),'gemini-9.1-flash-lite');
 assert.deepEqual(cachedModels(),['gemini-9.1-flash-lite','gemini-9.1-flash','gemini-9.1-pro','gemini-9.1-flash-preview']);
 assert.ok(outcome.notes.some(n=>n.includes('停用')));
 assert.ok(outcome.notes.some(n=>n.includes('額度')));
 // 下一次直接用上次成功的模型，不必再問 Google
 const tried2:string[]=[];
 const again=await runWithModelFallback('general',scripted({'gemini-9.1-flash-lite':{text:'OK2'}},tried2),{plan:'free',fetcher:noFetch});
 assert.deepEqual(tried2,['gemini-9.1-flash-lite']);assert.equal(again.model,'gemini-9.1-flash-lite');
});

test('when every known name is gone, only the brand-new model Google lists is used',async()=>{
 localStorage.setItem('hg_gemini_last_good_general','gemini-2.5-flash');
 const calls:string[]=[];const tried:string[]=[];
 const outcome=await runWithModelFallback('general',scripted({'gemini-12.0-flash':{text:'新模型'}},tried),{plan:'paid',fetcher:listFetch(['gemini-12.0-flash','gemini-12.0-flash-lite'],calls)});
 assert.deepEqual(calls,['/api/gemini/models']);
 assert.equal(outcome.model,'gemini-12.0-flash');
 assert.ok(tried.includes('gemini-2.5-flash')&&tried.includes('gemini-flash-latest')&&tried.includes('gemini-flash-lite-latest'));
});

test('an explicitly chosen model reports its quota honestly instead of switching',async()=>{
 saveModelPreferences('gemini-3.8-flash',AUTO_MODEL);
 const tried:string[]=[];
 await assert.rejects(runWithModelFallback('general',scripted({'gemini-3.8-flash':quota('gemini-3.8-flash')},tried),{plan:'free',fetcher:noFetch}),(err:any)=>err instanceof GeminiError&&err.code===429&&/gemini-3\.8-flash/.test(err.message)&&/沒有自動更換/.test(err.message));
 assert.deepEqual(tried,['gemini-3.8-flash']);
});

test('an explicitly chosen model that Google retired (404) falls through to the automatic list',async()=>{
 saveModelPreferences('gemini-2.5-flash',AUTO_MODEL);
 const tried:string[]=[];
 const outcome=await runWithModelFallback('general',scripted({'gemini-flash-lite-latest':{text:'OK'}},tried),{plan:'free',fetcher:noFetch});
 assert.deepEqual(tried,['gemini-2.5-flash','gemini-flash-lite-latest']);
 assert.equal(outcome.model,'gemini-flash-lite-latest');
 assert.ok(outcome.notes.some(n=>n.includes('gemini-2.5-flash')&&n.includes('停用')));
});

test('an invalid key stops immediately and never tries other models',async()=>{
 const tried:string[]=[];
 await assert.rejects(runWithModelFallback('general',scripted({'gemini-flash-lite-latest':badKey('gemini-flash-lite-latest')},tried),{plan:'free',fetcher:noFetch}),(err:any)=>err instanceof GeminiError&&classifyGeminiError(err)==='invalid_key');
 assert.deepEqual(tried,['gemini-flash-lite-latest']);
});

test('a paid plan is corrected to free when Google answers with a free-tier quota error',async()=>{
 setGeminiPlan('paid');
 const tried:string[]=[];
 const table={'gemini-flash-latest':quota('gemini-flash-latest','You exceeded your current quota. Limit: GenerateRequestsPerDayPerProjectPerModel-FreeTier'),'gemini-flash-lite-latest':{text:'OK'}};
 const outcome=await runWithModelFallback('general',scripted(table,tried),{fetcher:noFetch});
 assert.deepEqual(tried,['gemini-flash-latest','gemini-flash-lite-latest']);
 assert.equal(getGeminiPlan(),'free');
 assert.ok(outcome.notes.some(n=>n.includes('免費')));
 const notice=takePlanNotice();assert.ok(notice&&notice.includes('免費'));assert.equal(takePlanNotice(),null);
});

test('when every model is exhausted the error says the free quota resets tomorrow',async()=>{
 const table={'gemini-flash-lite-latest':quota('a'),'gemini-flash-latest':quota('b'),'gemini-9.0-flash-lite':quota('c'),'gemini-9.0-flash':quota('d')};
 await assert.rejects(runWithModelFallback('general',scripted(table),{plan:'free',fetcher:listFetch(['gemini-9.0-flash-lite','gemini-9.0-flash'])}),(err:any)=>err instanceof GeminiError&&err.code===429&&/明天會重置/.test(err.message));
 assert.equal(getLastGoodModel('general'),null);
});

test('classifyGeminiError understands status codes and Google status strings',()=>{
 assert.equal(classifyGeminiError(new GeminiError('x',429)),'quota');
 assert.equal(classifyGeminiError(new GeminiError('RESOURCE_EXHAUSTED',500)),'quota');
 assert.equal(classifyGeminiError(new GeminiError('x',404)),'model_missing');
 assert.equal(classifyGeminiError(new GeminiError('API key not valid',400)),'invalid_key');
 assert.equal(classifyGeminiError(new GeminiError('x',403,'PERMISSION_DENIED')),'invalid_key');
 assert.equal(classifyGeminiError(new Error('network down')),'other');
});
