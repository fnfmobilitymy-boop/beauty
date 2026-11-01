import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createCredits} from '../credits.mjs';
test('credit grants, usage reservations and refunds are durable and idempotent',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'kd-credits-')),url=pathToFileURL(dir+'/');try{
 const store=await createCredits(url),deposit={id:'d1',ownerId:'a',currency:'MYR',amount:'39.00'};
 const approval={action:'approve',packageId:'starter',note:'Bank settlement verified',confirmedAmountMYR:'39.00',settlementVerified:true};
 await assert.rejects(store.review(deposit,'admin',{...approval,settlementVerified:false}),e=>e.status===400);
 await assert.rejects(store.review({...deposit,currency:'USDT'},'admin',approval),e=>e.status===400);
 await assert.rejects(store.review(deposit,'admin',{...approval,confirmedAmountMYR:'1.00'}),e=>e.status===400);
 const result=await Promise.allSettled([store.review(deposit,'admin',approval),store.review(deposit,'admin',approval)]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal(store.wallet('a').balance,100);assert.equal(store.wallet('b').balance,0);
 const usage=await store.reserve('a',false);assert.equal(store.wallet('a').balance,99);await store.settle(usage.id,false);await store.settle(usage.id,false);assert.equal(store.wallet('a').balance,100);
 const revision=await store.reserve('a',true);await store.settle(revision.id,true);await store.settle(revision.id,false);assert.equal(store.wallet('a').balance,99.5);
 await assert.rejects(store.reserve('b',false),e=>e.status===402);
 await store.review({id:'reject',ownerId:'a',currency:'MYR',amount:'39.00'},'admin',{action:'reject',note:'No matching bank settlement'});assert.equal(store.decision('reject').status,'rejected');
 await assert.rejects(store.review({id:'reject'},'admin',approval),e=>e.status===409);
 const restored=await createCredits(url);assert.deepEqual(restored.wallet('a'),store.wallet('a'));assert.equal(restored.decision('d1').credits,100);
 // Only one of simultaneous requests can spend the last half credit.
 for(let n=0;n<198;n++){const r=await store.reserve('a',true);await store.settle(r.id,true)}
 const last=await Promise.allSettled([store.reserve('a',true),store.reserve('a',true)]);assert.equal(last.filter(r=>r.status==='fulfilled').length,1);assert.equal(store.wallet('a').balance,0);
 }finally{await rm(dir,{recursive:true,force:true})}
});
