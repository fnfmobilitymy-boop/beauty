import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createAuth} from '../auth.mjs';
import {loadDocument} from '../storage.mjs';
import {pathToFileURL} from 'node:url';
test('deployment configuration preserves credentials without logging values',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'kd-deploy-'));try{const script=resolve('scripts/configure-deploy.py'),input={publicHost:'testing.example.com',aiKey:'synthetic-not-real-key'};const run=data=>spawnSync('python3',[script],{cwd:dir,input:JSON.stringify(data),encoding:'utf8'});assert.equal(run(input).status,0);const app=await readFile(join(dir,'deploy/.private/app.env'),'utf8'),worker=await readFile(join(dir,'deploy/.private/runner.env'),'utf8');const token=app.match(/KD_RUNNER_TOKEN=(.+)/)[1];assert(token.length>=32);assert(worker.includes(token));const again=run({publicHost:'testing.example.com'});assert.equal(again.status,0);assert(!again.stdout.includes(token));assert(!again.stdout.includes(input.aiKey));assert.equal(await readFile(join(dir,'deploy/.private/app.env'),'utf8'),app);assert.notEqual(run({publicHost:'bad;host',aiKey:'test'}).status,0);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('offline administrator binding requires a real account ID and is durable',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'kd-admin-bind-'));try{const auth=await createAuth(pathToFileURL(dir+'/')),user=await auth.register('owner@example.com','owner-test-password');const run=id=>spawnSync(process.execPath,['admin-cli.mjs','bind',id],{env:{...process.env,KD_DATA_DIR:dir},encoding:'utf8'});assert.notEqual(run('unknown-id').status,0);assert.equal(run(user.id).status,0);assert.deepEqual((await loadDocument(pathToFileURL(dir+'/'),'admin-roles.json',{})).ids,[user.id]);assert.equal(run(user.id).status,0);assert.equal((await loadDocument(pathToFileURL(dir+'/'),'admin-roles.json',{})).ids.length,1)
 }finally{await rm(dir,{recursive:true,force:true})}
});
