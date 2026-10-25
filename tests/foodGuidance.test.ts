import {test} from 'node:test';
import assert from 'node:assert/strict';
import {foodGuides} from '../services/foodGuidance';
test('kidney restrictions take precedence over generic diabetes and DASH food lists',()=>{const g=foodGuides(['慢性腎病 (CKD)','高血壓 (Hypertension)','糖尿病 (Diabetes)']);assert.equal(g.length,1);assert.match(g[0].title,/腎臟病/);assert.match(g[0].note,/暫不套用/);});
test('free text allergies suppress specific recommended foods',()=>{const g=foodGuides(['高血壓'],'牛奶、堅果');assert.equal(g.length,1);assert.match(g[0].title,/過敏/);assert.doesNotMatch(g[0].prefer,/低脂乳品/);});
test('unsupported conditions do not get invented guidance; known conditions retain separate advice',()=>{assert.deepEqual(foodGuides(['甲狀腺問題']),[]);assert.equal(foodGuides(['高血壓','糖尿病']).length,2);assert.deepEqual(foodGuides(),[]);});
