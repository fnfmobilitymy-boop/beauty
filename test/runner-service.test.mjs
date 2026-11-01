import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {runSandbox} from '../coding-sandbox.mjs';
test('remote runner requires a server token and validates requests',async()=>{
 const token='isolated-runner-test-token-0123456789';const child=spawn(process.execPath,['runner-service.mjs'],{env:{...process.env,KD_RUNNER_PORT:'0',KD_RUNNER_TOKEN:token},stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',c=>output+=c);const savedURL=process.env.KD_RUNNER_URL,savedToken=process.env.KD_RUNNER_TOKEN;
 try{await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',c=>reject(Error('runner exited '+c)))});const port=output.match(/listening on (\d+)/)[1],base='http://127.0.0.1:'+port;
 const unauthorized=await fetch(base+'/run',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(unauthorized.status,401);
 const invalid=await fetch(base+'/run',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({files:{'../escape':'bad'},command:'node --test'})});assert.equal(invalid.status,400);
 process.env.KD_RUNNER_URL=base;process.env.KD_RUNNER_TOKEN=token;await assert.rejects(runSandbox({},''),e=>e.status===400);
 if(process.env.KD_SANDBOX_TESTS==='1'){const result=await runSandbox({'main.mjs':'console.log("remote runner verified")'},'node main.mjs');assert.equal(result.exitCode,0);assert.match(result.stdout,/remote runner verified/)}
 process.env.KD_RUNNER_URL='http://untrusted.example';await assert.rejects(runSandbox({},'echo test'),e=>e.status===503);
 }finally{if(savedURL===undefined)delete process.env.KD_RUNNER_URL;else process.env.KD_RUNNER_URL=savedURL;if(savedToken===undefined)delete process.env.KD_RUNNER_TOKEN;else process.env.KD_RUNNER_TOKEN=savedToken;child.kill();await new Promise(r=>child.once('close',r))}
});

test('runner socket transport is authenticated and does not expose Docker API',async()=>{
 const {mkdtemp,rm}=await import('node:fs/promises');const {join}=await import('node:path');const {tmpdir}=await import('node:os');const dir=await mkdtemp(join(tmpdir(),'kd-uds-')),socket=join(dir,'runner.sock'),token='socket-runner-test-token-0123456789';const child=spawn(process.execPath,['runner-service.mjs'],{env:{...process.env,KD_RUNNER_SOCKET:socket,KD_RUNNER_TOKEN:token},stdio:['ignore','pipe','pipe']});const previousSocket=process.env.KD_RUNNER_SOCKET,previousToken=process.env.KD_RUNNER_TOKEN;
 try{await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',c=>reject(Error('socket runner exited '+c)))});process.env.KD_RUNNER_SOCKET=socket;process.env.KD_RUNNER_TOKEN='incorrect-token-01234567890123456789';await assert.rejects(runSandbox({},''),e=>e.status===401);process.env.KD_RUNNER_TOKEN=token;await assert.rejects(runSandbox({},''),e=>e.status===400);if(process.env.KD_SANDBOX_TESTS==='1'){const r=await runSandbox({'hello.mjs':'console.log("socket verified")'},'node hello.mjs');assert.equal(r.exitCode,0);assert.match(r.stdout,/socket verified/)}
 }finally{if(previousSocket===undefined)delete process.env.KD_RUNNER_SOCKET;else process.env.KD_RUNNER_SOCKET=previousSocket;if(previousToken===undefined)delete process.env.KD_RUNNER_TOKEN;else process.env.KD_RUNNER_TOKEN=previousToken;child.kill();await new Promise(r=>child.once('close',r));await rm(dir,{recursive:true,force:true})}
});
