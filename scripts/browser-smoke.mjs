import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm,mkdir,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createAuth} from '../auth.mjs';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const dir=await mkdtemp(join(tmpdir(),'kd-e2e-'));let server,browser,ws,call;
async function waitFor(fn){for(let i=0;i<200;i++){const value=await fn();if(value)return value;await delay(100)}throw Error('Readiness timeout')}
async function stop(child){if(!child||child.exitCode!==null)return;const done=new Promise(r=>child.once('close',r));child.kill();await Promise.race([done,delay(3000)]);if(child.exitCode===null)child.kill('SIGKILL')}
try{
 const auth=await createAuth(pathToFileURL(dir+'/'));const admin=await auth.register('e2e-admin@example.com','e2e-admin-password');await auth.register('e2e-user@example.com','e2e-user-password');
 const stub=join(dir,'ai-stub.mjs');await writeFile(stub,`globalThis.fetch=async()=>Response.json({choices:[{finish_reason:'stop',message:{content:'<!doctype html><html><h1>Browser fixture</h1></html>'}}]});`);
 server=spawn(process.execPath,['--import',stub,'server.mjs'],{env:{...process.env,PORT:'0',KD_DATA_DIR:dir,KD_ADMIN_USER_IDS:admin.id,KD_AI_API_KEY:'synthetic-browser-test',KD_CREDITS_BILLING:'enabled',KD_SECURE_COOKIES:'disabled'},stdio:['ignore','pipe','pipe']});
 let output='';server.stdout.on('data',c=>output+=c);const port=await waitFor(()=>output.match(/port (\d+)/)?.[1]);
 let executable=process.env.CHROME_PATH;for(const p of ['/usr/bin/chromium','/usr/bin/google-chrome','/usr/bin/google-chrome-stable']){if(executable)break;try{await access(p);executable=p}catch{}}
 if(!executable)throw Error('Chromium required: set CHROME_PATH');
 const profile=join(dir,'browser');browser=spawn(executable,['--headless','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
 const debugPort=await waitFor(async()=>{try{return (await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]}catch{return null}});
 const tabs=await(await fetch(`http://127.0.0.1:${debugPort}/json`)).json();ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});let sequence=0;const pending=new Map();ws.onmessage=e=>{const data=JSON.parse(e.data);if(data.id){pending.get(data.id)?.(data);pending.delete(data.id)}};
 call=(method,params={})=>new Promise(resolve=>{const id=++sequence;pending.set(id,resolve);ws.send(JSON.stringify({id,method,params}))});
 async function ev(expression){const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.error){if(/context|navigat|Inspected target/i.test(r.error.message))return undefined;throw Error(r.error.message)}if(r.result?.exceptionDetails)throw Error(JSON.stringify(r.result.exceptionDetails));return r.result.result.value}
 const until=expression=>waitFor(()=>ev(expression));
 const base=`http://127.0.0.1:${port}`;
 await call('Page.navigate',{url:base});await until("typeof document.querySelector('#auth-form')?.onsubmit==='function'");
 await ev("document.querySelector('#account').click();document.querySelector('#email').value='e2e-user@example.com';document.querySelector('#password').value='e2e-user-password';document.querySelector('#auth-form').requestSubmit()");await until("!document.querySelector('#logout').hidden");
 await ev("document.querySelector('#topup').click()");await until("document.querySelector('#deposit-amount').value==='39.00'");assert.equal(await ev("document.querySelector('#deposit-amount').readOnly"),true);
 await ev("document.querySelector('#deposit-reference').value='e2e-bank-transfer';document.querySelector('#deposit-country').checked=true;document.querySelector('#deposit-form').requestSubmit()");await until("document.querySelectorAll('.deposit-record').length===1");assert(await ev("document.querySelector('#deposit-records').textContent.includes('待核实')"));
 await ev("fetch('/api/auth/logout',{method:'POST'})");await call('Page.navigate',{url:base+'/admin'});await until("typeof document.querySelector('#login-form')?.onsubmit==='function'");
 await ev("document.querySelector('#email').value='e2e-admin@example.com';document.querySelector('#password').value='e2e-admin-password';document.querySelector('#login-form').requestSubmit()");await until("!document.querySelector('#workspace').hidden");
 await ev("document.querySelector('#confirm-password').value='e2e-admin-password';document.querySelector('#unlock-form').requestSubmit()");await until("!document.querySelector('#deposit-list .approve').disabled");await ev("window.confirm=()=>true;document.querySelector('#deposit-list .approve').click()");await until("document.querySelector('#ledger-list').textContent.includes('充值')");assert(await ev("document.querySelector('#ledger-list').textContent.includes('充值')"));
 await ev("document.querySelector('#logout').click()");await until("document.querySelector('#workspace').hidden");await call('Page.navigate',{url:base});await until("typeof document.querySelector('#auth-form')?.onsubmit==='function'");
 await ev("document.querySelector('#account').click();document.querySelector('#email').value='e2e-user@example.com';document.querySelector('#password').value='e2e-user-password';document.querySelector('#auth-form').requestSubmit()");await until("!document.querySelector('#logout').hidden");
 await ev("document.querySelector('#mode-quick').click();document.querySelector('#prompt').value='Build a test landing page';document.querySelector('#generate').requestSubmit()");await until("document.querySelector('#editor').open");assert(await ev("document.querySelector('#code').value.includes('Browser fixture')"));
 await ev("document.querySelector('#save').click()");await until("!document.querySelector('#save').disabled");
 await ev("document.querySelector('#code').value='<h1>Updated</h1>';document.querySelector('#code').dispatchEvent(new Event('input'));document.querySelector('#save').click()");await until("!document.querySelector('#save').disabled");
 await ev("document.querySelector('#history').click()");await until("document.querySelectorAll('.version-row').length===1");await ev("window.confirm=()=>true;document.querySelector('.version-row button').click()");await until("document.querySelector('#code').value.includes('Browser fixture')");
 await ev("document.querySelector('#close').click();document.querySelector('#topup').click()");await until("document.querySelector('#wallet-summary').textContent.includes('99 Credits')");assert(await ev("document.querySelector('#deposit-records').textContent.includes('已入账 100 Credits')"));
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert(await ev('document.documentElement.scrollWidth<=390'));
 console.log('PASS browser E2E: login, quoted top-up, admin settlement, ledger, AI fixture generation/debit, project saves/history restore, mobile layout');
}catch(e){if(call){try{const r=await call('Page.captureScreenshot');if(r.result?.data){await mkdir('test-results',{recursive:true});await writeFile('test-results/browser-failure.png',Buffer.from(r.result.data,'base64'))}}catch{}}throw e}
finally{ws?.close();await stop(browser);await stop(server);await rm(dir,{recursive:true,force:true})}
