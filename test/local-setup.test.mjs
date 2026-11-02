import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {prepareLocal} from '../scripts/local-config.mjs';
import {sampleFiles} from '../sample-project.mjs';
import {runSandbox} from '../coding-sandbox.mjs';
test('local setup creates matching private credentials, preserves keys and validates port',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'kd-local-'));try{assert.equal((await prepareLocal(dir,38123)).port,38123);const appFile=join(dir,'deploy/.private/local/app.env'),workerFile=join(dir,'deploy/.private/local/runner.env');let app=await readFile(appFile,'utf8');const token=app.match(/^KD_RUNNER_TOKEN=(.+)$/m)[1];assert(token.length>=32);assert((await readFile(workerFile,'utf8')).includes(token));assert(app.includes('KD_AI_API_KEY=\n'));await writeFile(appFile,app.replace('KD_AI_API_KEY=','KD_AI_API_KEY=synthetic-local-only'));assert.equal((await prepareLocal(dir)).port,38123);app=await readFile(appFile,'utf8');assert(app.includes('KD_AI_API_KEY=synthetic-local-only\n'));assert(app.includes(token));await assert.rejects(prepareLocal(dir,'bad'),/端口/);assert.equal(JSON.parse(sampleFiles['package.json']).scripts.test,'node --test')
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('free local sample runs backend tests without AI or external dependencies',{skip:process.env.KD_SANDBOX_TESTS!=='1'},async()=>{const result=await runSandbox(sampleFiles,'npm test');assert.equal(result.exitCode,0,result.stderr);assert.match(result.stdout,/pass 1/)});
