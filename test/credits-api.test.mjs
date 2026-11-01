import {loadDocument} from '../storage.mjs';
import {pathToFileURL as storageURL} from 'node:url';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {createAuth} from '../auth.mjs';
test('admin review needs bound account and password, grants once, and stays private',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'kd-admin-'));const auth=await createAuth(pathToFileURL(dir+'/'));const admin=await auth.register('owner@example.com','test-admin-password');const port=41000+Math.floor(Math.random()*10000);await writeFile(join(dir,'ai-stub.mjs'),`const original=globalThis.fetch;globalThis.fetch=async(url,options)=>{if(url==='https://api.openai.com/v1/chat/completions'){const prompt=JSON.parse(options.body).messages[1].content;return prompt.includes('fail-test')?new Response('{}',{status:503}):Response.json({choices:[{finish_reason:'stop',message:{content:'<!doctype html><h1>Generated</h1>'}}]})}return original(url,options)};`);const child=spawn(process.execPath,['--import',join(dir,'ai-stub.mjs'),'server.mjs'],{env:{...process.env,PORT:String(port),KD_DATA_DIR:dir,KD_ADMIN_USER_IDS:admin.id,KD_CREDITS_BILLING:'enabled',KD_AI_API_KEY:'isolated-test-key'},stdio:['ignore','pipe','pipe']});
 try{await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',c=>reject(Error('server exited '+c)))});
 async function req(path,method='GET',data,cookie){const r=await fetch(`http://127.0.0.1:${port}`+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}}
 const a=await req('/api/auth/login','POST',{email:'owner@example.com',password:'test-admin-password'});const b=await req('/api/auth/register','POST',{email:'customer@example.com',password:'customer-password'});
 assert.equal((await req('/api/health')).data.status,'ok');
 assert.equal((await req('/api/admin/overview','GET',null,b.cookie)).status,403);
 const overview=(await req('/api/admin/overview','GET',null,a.cookie)).data;assert.equal(overview.counts.users,2);assert.equal(overview.users.length,2);assert(!JSON.stringify(overview).includes('hash'));assert(!JSON.stringify(overview).includes('password'));
 assert.equal((await req('/api/admin/deposits')).status,403);assert.equal((await req('/api/admin/deposits','GET',null,b.cookie)).status,403);
 const d=await req('/api/deposits','POST',{method:'hlb',amount:'39.00',reference:'verified-transfer-001',country:'MY'},b.cookie);
 const input={action:'approve',packageId:'starter',confirmedAmountMYR:'39.00',settlementVerified:true,note:'Verified bank statement',currentPassword:'wrong'};
 assert.equal((await req('/api/admin/deposits/'+d.data.id,'POST',input,a.cookie)).status,400);input.currentPassword='test-admin-password';
 assert.equal((await req('/api/admin/deposits/'+d.data.id,'POST',input,a.cookie)).status,200);assert.equal((await req('/api/admin/deposits/'+d.data.id,'POST',input,a.cookie)).status,409);
 const wallet=(await req('/api/credits','GET',null,b.cookie)).data;assert.equal(wallet.balance,100);assert.equal(wallet.admin,false);assert.equal(wallet.billingEnabled,true);assert.equal((await req('/api/credits','GET',null,a.cookie)).data.balance,0);
 assert.equal((await req('/api/deposits','GET',null,b.cookie)).data[0].review.status,'approved');
 assert.equal((await req('/api/admin/rates','POST',{USDT:'4',USD:null},b.cookie)).status,403);
 assert.equal((await req('/api/admin/rates','GET',null,a.cookie)).data.unlocked,true);
 assert.equal((await req('/api/admin/rates','POST',{USDT:'4',USD:null},a.cookie)).status,200);
 const q=await req('/api/deposits/quote','POST',{method:'usdt',currency:'USDT',packageId:'starter'},b.cookie);assert.equal(q.status,201);assert.equal(q.data.amount,'9.750000');
 const quotedDeposit=await req('/api/deposits','POST',{method:'usdt',quoteId:q.data.id,country:'MY',reference:'c'.repeat(64)},b.cookie);assert.equal(quotedDeposit.status,201);
 assert.equal((await req('/api/admin/deposits/'+quotedDeposit.data.id,'POST',{action:'approve',settlementVerified:true},a.cookie)).status,200);
 assert.equal((await req('/api/credits','GET',null,b.cookie)).data.balance,200);

 assert.equal((await req('/api/generate','POST',{prompt:'new site'},a.cookie)).status,402);
 assert.equal((await req('/api/generate','POST',{prompt:'new site'},b.cookie)).status,200);assert.equal((await req('/api/credits','GET',null,b.cookie)).data.balance,199);
 assert.equal((await req('/api/generate','POST',{prompt:'revise',html:'<h1>old</h1>'},b.cookie)).status,200);assert.equal((await req('/api/credits','GET',null,b.cookie)).data.balance,198.5);
 assert.equal((await req('/api/generate','POST',{prompt:'fail-test'},b.cookie)).status,502);const afterFailure=(await req('/api/credits','GET',null,b.cookie)).data;assert.equal(afterFailure.balance,198.5);assert.equal(afterFailure.entries[0].type,'refund');

 }finally{child.kill();await new Promise(r=>child.once('close',r));await rm(dir,{recursive:true,force:true})}
});
