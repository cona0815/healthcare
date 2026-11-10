import {test} from 'node:test';
import assert from 'node:assert/strict';
import {detectInstallEnv,externalBrowserUrl,cleanedUrl} from '../services/installGuide';

const IOS_LINE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/15.8.1';
const ANDROID_LINE='Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 Line/15.8.0/IAB';
const IOS_SAFARI='Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1';
const IPAD_DESKTOP='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15';
const ANDROID_CHROME='Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36';
const DESKTOP='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36';
const notStandalone=()=>({matches:false});

test('detects LINE in-app browser and phone OS',()=>{
 assert.deepEqual(detectInstallEnv({userAgent:IOS_LINE},notStandalone),{inLine:true,os:'ios',standalone:false});
 assert.deepEqual(detectInstallEnv({userAgent:ANDROID_LINE},notStandalone),{inLine:true,os:'android',standalone:false});
 assert.deepEqual(detectInstallEnv({userAgent:IOS_SAFARI},notStandalone),{inLine:false,os:'ios',standalone:false});
 assert.deepEqual(detectInstallEnv({userAgent:ANDROID_CHROME},notStandalone),{inLine:false,os:'android',standalone:false});
 assert.deepEqual(detectInstallEnv({userAgent:DESKTOP,maxTouchPoints:0},notStandalone),{inLine:false,os:'other',standalone:false});
});

test('iPad with a desktop user agent counts as iOS; home-screen launch counts as standalone',()=>{
 assert.equal(detectInstallEnv({userAgent:IPAD_DESKTOP,maxTouchPoints:5},notStandalone).os,'ios');
 assert.equal(detectInstallEnv({userAgent:IPAD_DESKTOP,maxTouchPoints:0},notStandalone).os,'other');
 assert.equal(detectInstallEnv({userAgent:IOS_SAFARI,standalone:true},notStandalone).standalone,true);
 assert.equal(detectInstallEnv({userAgent:ANDROID_CHROME},q=>({matches:q==='(display-mode: standalone)'})).standalone,true);
});

test('LINE external-browser link keeps demo mode and opens the guide; one-time params are removed afterwards',()=>{
 const link=new URL(externalBrowserUrl('https://healthcona.netlify.app/?demo=1#top'));
 assert.equal(link.searchParams.get('openExternalBrowser'),'1');
 assert.equal(link.searchParams.get('install'),'1');
 assert.equal(link.searchParams.get('view'),'settings');
 assert.equal(link.searchParams.get('demo'),'1');
 assert.equal(cleanedUrl(link.toString()),'/?demo=1#top');
 assert.equal(cleanedUrl('https://healthcona.netlify.app/?view=settings'),'/');
 assert.equal(cleanedUrl('https://healthcona.netlify.app/'),'/');
});
