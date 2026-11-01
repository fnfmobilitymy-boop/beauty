import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createWorkspaces} from '../coding-workspaces.mjs';
import {validateFiles} from '../coding-sandbox.mjs';
import {runCodingAgent} from '../coding-agent.mjs';
test('multi-file workspaces enforce owner/revision checks and task locks',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'kd-workspaces-'));try{const store=await createWorkspaces(pathToFileURL(dir+'/'));const row=await store.create('a','Calculator');assert.throws(()=>store.read('b',row.id),e=>e.status===404);
 for(const path of ['../secret','/etc/passwd','a/../../x','.git/config','node_modules/x'])assert.throws(()=>validateFiles({[path]:'bad'}));
 const edited=await store.edit('a',row.id,{'calc.mjs':'export const sum=(a,b)=>a+b;'},row.revision);assert.equal(Object.keys(edited.files).length,1);
 await assert.rejects(store.edit('a',row.id,{'calc.mjs':'bad'},row.revision),e=>e.status===409);
 const job=await store.start('a',row.id,'test','agent');await assert.rejects(store.start('a',row.id,'second','agent'),e=>e.status===409);await assert.rejects(store.edit('a',row.id,{},null),e=>e.status===409);
 await store.edit('a',row.id,{'calc.mjs':'fixed'},null,true);await store.finish('a',row.id,job.id,'completed','done');const version=store.read('a',row.id).history[0];await store.restore('a',row.id,version.id);assert.equal(store.read('a',row.id).files['calc.mjs'],'export const sum=(a,b)=>a+b;');
 await store.rename('a',row.id,'Renamed');assert.equal(store.read('a',row.id).name,'Renamed');await assert.rejects(store.remove('b',row.id),e=>e.status===404);
 const reload=await createWorkspaces(pathToFileURL(dir+'/'));assert.deepEqual(reload.read('a',row.id).files,store.read('a',row.id).files);await store.remove('a',row.id);assert.equal(store.list('a').length,0);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('coding agent writes files, observes a failed check, fixes and reruns',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'kd-agent-'));try{const store=await createWorkspaces(pathToFileURL(dir+'/')),row=await store.create('a','Fix test'),job=await store.start('a',row.id,'Create calculator','agent');let turn=0,commands=0;
 const tool=(name,args)=>({id:'call-'+turn+'-'+name,type:'function',function:{name,arguments:JSON.stringify(args)}});
 const replies=[()=>({tool_calls:[tool('write_files',{files:[{path:'calc.mjs',content:'buggy'}]}),tool('run_command',{command:'node --test'})]}),()=>({tool_calls:[tool('write_files',{files:[{path:'calc.mjs',content:'fixed'}]}),tool('run_command',{command:'node --test'})]}),()=>({content:'已修复并通过测试'})];
 const fetchImpl=async()=>Response.json({choices:[{message:replies[turn++]()}]});
 const runner=async(files)=>{commands++;return {exitCode:files['calc.mjs']==='fixed'?0:1,stdout:'test results',stderr:'',files}};
 const result=await runCodingAgent(store,'a',row.id,job.id,'Create calculator',{fetchImpl,runner});assert.equal(result.status,'completed');assert.equal(commands,2);assert.equal(store.read('a',row.id).files['calc.mjs'],'fixed');assert(store.read('a',row.id).jobs[0].events.some(e=>e.result?.exitCode===1));
 await store.finish('a',row.id,job.id,result.status,result.summary);
 }finally{await rm(dir,{recursive:true,force:true})}
});
