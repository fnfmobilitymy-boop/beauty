import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createQuotes} from '../recharge-quotes.mjs';
import {createDeposits} from '../deposits.mjs';
import {createCredits} from '../credits.mjs';
test('package quotes lock rates and amounts, then support one-confirmation settlement',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'kd-quotes-')),url=pathToFileURL(dir+'/');try{
 const quotes=await createQuotes(url),deposits=await createDeposits(url),credits=await createCredits(url);
 await assert.rejects(quotes.create('a','usdt','USDT','starter'),e=>e.status===503);
 const myr=await quotes.create('a','hlb','MYR','plus');assert.equal(myr.amount,'99.00');assert.equal(myr.credits,300);
 await quotes.updateRates('admin',{USDT:'4',USD:'4.2'});
 const q=await quotes.create('a','usdt','USDT','starter');assert.equal(q.amount,'9.750000');assert.equal(q.rateMYR,'4');
 await quotes.updateRates('admin',{USDT:'5',USD:null});assert.equal(quotes.get('a',q.id).rateMYR,'4');assert.equal((await quotes.create('a','usdt','USDT','starter')).amount,'7.800000');
 assert.throws(()=>quotes.get('b',q.id),e=>e.status===404);
 const d=await deposits.submit('a',{method:'usdt',amount:'0.01',reference:'a'.repeat(64),country:'MY'},quotes.get('a',q.id));assert.equal(d.amount,'9.750000');
 await assert.rejects(deposits.submit('a',{method:'tng',reference:'other-reference',country:'MY'},q),e=>e.status===400);
 const approved=await credits.review(d,'admin',{action:'approve',settlementVerified:true});assert.equal(approved.credits,100);assert.equal(approved.quote.rateMYR,'4');assert.equal(credits.wallet('a').balance,100);
 await assert.rejects(credits.review(d,'admin',{action:'approve',settlementVerified:true}),e=>e.status===409);
 await assert.rejects(deposits.submit('a',{method:'usdt',reference:'b'.repeat(64),country:'MY'},q),e=>e.status===409);
 const reload=await createQuotes(url);assert.deepEqual(reload.rates(),quotes.rates());
 const usd=await quotes.create('a','stripe','MYR','starter');const now=Date.now;try{Date.now=()=>now()+31*60000;assert.throws(()=>quotes.get('a',usd.id),e=>e.status===409)}finally{Date.now=now}
 await assert.rejects(quotes.updateRates('admin',{USDT:'-1',USD:null}),e=>e.status===400);
 await quotes.updateRates('admin',{USDT:'3',USD:null});assert.equal((await quotes.create('a','usdt','USDT','starter')).amount,'13.000000');assert.equal((await quotes.create('a','usdt','USDT','plus')).amount,'33.000000');
 }finally{await rm(dir,{recursive:true,force:true})}
});
