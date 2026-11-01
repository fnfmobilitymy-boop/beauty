import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runSandbox} from '../coding-sandbox.mjs';
test('real isolated container runs tests without host credentials or filesystem', {skip:process.env.KD_SANDBOX_TESTS!=='1'},async()=>{
 const files={'sum.mjs':'export const sum=(a,b)=>a+b;','sum.test.mjs':"import {test} from 'node:test';import assert from 'node:assert/strict';import {sum} from './sum.mjs';test('sum',()=>assert.equal(sum(2,3),5));"};
 const result=await runSandbox(files,'node --test');assert.equal(result.exitCode,0);assert.match(result.stdout,/pass 1/);assert.equal(result.files['sum.mjs'],files['sum.mjs']);
 const isolated=await runSandbox({'check.mjs':"import fs from 'node:fs';import assert from 'node:assert/strict';assert.equal(process.env.KD_AI_API_KEY,undefined);assert.equal(fs.existsSync('/var/run/docker.sock'),false);assert.throws(()=>fs.writeFileSync('/etc/kd-write','no'));fs.symlinkSync('/etc/passwd','/work/leak');console.log('isolated');"},'node check.mjs');assert.equal(isolated.exitCode,0);assert.match(isolated.stdout,/isolated/);assert.equal(isolated.files.leak,undefined);
 const failed=await runSandbox(files,'node -e "process.exit(7)"');assert.equal(failed.exitCode,7);
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),800);await assert.rejects(runSandbox({},'node -e \"setInterval(()=>{},1000)\"',{signal:controller.signal}),e=>e.name==='AbortError');clearTimeout(timer);
});
