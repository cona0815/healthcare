import {test} from 'node:test';import assert from 'node:assert/strict';
import {jointAngle,measurePose,targetStatus} from '../services/poseMetrics';
const p=(x:number,y:number,visibility=1)=>({x,y,visibility});
test('joint angle uses pixel aspect ratio rather than normalized image distortion',()=>{assert.equal(jointAngle(p(0,0),p(0,1),p(1,1),1920,1080),90);assert.equal(jointAngle(p(0,0),p(.5,.5),p(1,1),1920,1080),180);});
test('occluded or degenerate joints are unknown rather than falsely scored',()=>{assert.equal(jointAngle(p(0,0,.1),p(0,1),p(1,1),100,100),null);assert.equal(jointAngle(p(0,0),p(0,0),p(1,1),100,100),null);assert.equal(measurePose([],100,100,0).leftKnee,null);assert.equal(measurePose([],100,100,0).coverage,0);});
test('user target comparison distinguishes unknown, within range and degree deviation',()=>{assert.equal(targetStatus(null,150,170),'unknown');assert.equal(targetStatus(160,150,170),'inside');assert.equal(targetStatus(145,150,170),'near');assert.equal(targetStatus(120,150,170),'outside');});
