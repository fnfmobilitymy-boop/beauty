import {loadDocument} from '../storage.mjs';
import {pathToFileURL as storageURL} from 'node:url';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createDeposits,paymentMethods} from '../deposits.mjs';
test('deposit declarations persist, isolate accounts and never credit automatically',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'kd-deposits-')),url=pathToFileURL(dir+'/');try{
 const store=await createDeposits(url);
 for(const input of [null,{method:'hlb',amount:'0',reference:'test',country:'MY'},{method:'hlb',amount:'10',reference:'test',country:'US'},{method:'unknown',amount:'10',reference:'test',country:'MY'},{method:'usdt',amount:'10',reference:'not-a-hash',country:'MY'}])await assert.rejects(store.submit('a',input),e=>e.status===400);
 const item={method:'hlb',amount:'50.00',reference:'BANK-REFERENCE-001',country:'MY'};
 const results=await Promise.allSettled([store.submit('a',item),store.submit('b',item)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
 assert.equal(store.list('a').length,1);assert.equal(store.list('b').length,0);assert.equal(store.list('a')[0].status,'pending_review');assert.equal(store.list('a')[0].currency,'MYR');assert.equal(store.list('a')[0].credits,undefined);
 await store.submit('b',{method:'usdt',amount:'10.50',reference:'a'.repeat(64),country:'MY'});assert.equal(store.list('b')[0].currency,'USDT');
 const restored=await createDeposits(url);assert.deepEqual(restored.list('a'),store.list('a'));assert.equal((await loadDocument(storageURL(dir+'/'),'deposits.json',[])).length,2);
 assert.equal(paymentMethods.find(m=>m.id==='hlb').account,'27401009500');assert.equal(paymentMethods.find(m=>m.id==='tng').account,'9988001218176');assert.equal(paymentMethods.find(m=>m.id==='usdt').account,'TDp1jRv52pC1bGqbpkZHmXsMEEWGdgEbNd');
 }finally{await rm(dir,{recursive:true,force:true})}
});
