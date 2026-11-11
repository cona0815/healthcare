import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeGenerateConfig,validContents,publicErrorMessage} from '../proxyGuard';

test('proxy drops httpOptions and other request-routing fields so it cannot be used for SSRF',()=>{
 const out=sanitizeGenerateConfig({httpOptions:{baseUrl:'http://127.0.0.1:9001',headers:{'x-evil':'1'}},abortSignal:{},responseMimeType:'application/json',maxOutputTokens:8,thinkingConfig:{thinkingLevel:'low'}});
 assert.deepEqual(out,{responseMimeType:'application/json',maxOutputTokens:8,thinkingConfig:{thinkingLevel:'low'}});
});

test('proxy keeps only Google Search / Maps tools with empty settings',()=>{
 const out=sanitizeGenerateConfig({tools:[{googleMaps:{}},{googleSearch:{x:1}},{urlContext:{}},{functionDeclarations:[]},{googleSearch:{},codeExecution:{}}],toolConfig:{retrievalConfig:{latLng:{latitude:1,longitude:2}}}});
 assert.deepEqual(out,{tools:[{googleMaps:{}},{googleSearch:{}}],toolConfig:{retrievalConfig:{latLng:{latitude:1,longitude:2}}}});
 assert.throws(()=>sanitizeGenerateConfig({tools:'x'}));
 assert.throws(()=>sanitizeGenerateConfig([1]));
 assert.equal(sanitizeGenerateConfig(undefined),undefined);
});

test('proxy validates contents shape',()=>{
 assert.equal(validContents('請只回答 OK'),true);
 assert.equal(validContents([{parts:[{text:'x'}]}]),true);
 for(const bad of ['',undefined,null,5]) assert.equal(validContents(bad),false);
});

test('proxy error text keeps Google explanations but hides raw upstream bodies',()=>{
 assert.equal(publicErrorMessage('got status: 429. {"error":{"code":429,"message":"Quota exceeded for metric: generate_content_free_tier_requests","status":"RESOURCE_EXHAUSTED"}}',429),'Quota exceeded for metric: generate_content_free_tier_requests');
 assert.equal(publicErrorMessage('internal secret page <html>admin</html>',500),'Gemini service error');
 assert.match(publicErrorMessage('API key not valid. Please pass a valid API key.',400),/API key not valid/);
});
