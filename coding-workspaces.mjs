import {loadDocument,saveDocument} from './storage.mjs';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {validateFiles} from './coding-sandbox.mjs';
const fail=(text,status=400)=>Object.assign(Error(text),{status});
export async function createWorkspaces(directory){
 let rows=[];const file=new URL('coding-workspaces.json',directory);rows=await loadDocument(directory,'coding-workspaces.json',[]);let queue=Promise.resolve();const active=new Set();
 // Jobs cannot be resumed after a process restart; keep their changes and mark the interruption.
 for(const row of rows)for(const job of row.jobs)if(job.status==='running'){job.status='interrupted';job.summary='服务已重启，任务中断。已有文件保留，请检查后重试。'}
 const get=(owner,id)=>{const r=rows.find(r=>r.ownerId===owner&&r.id===id);if(!r)throw fail('工作区不存在',404);return r};
 function change(fn){const task=queue.then(async()=>{const next=structuredClone(rows);const result=fn(next);await saveDocument(directory,'coding-workspaces.json',next);rows=next;return structuredClone(result)});queue=task.catch(()=>{});return task}
 const find=(s,owner,id)=>{const r=s.find(r=>r.ownerId===owner&&r.id===id);if(!r)throw fail('工作区不存在',404);return r};
 return {
 count:()=>rows.length,
 list(owner){return rows.filter(r=>r.ownerId===owner).map(({files,jobs,history,...r})=>({...r,fileCount:Object.keys(files).length,busy:active.has(r.id)}))},
 read(owner,id){return {...structuredClone(get(owner,id)),busy:active.has(id)}},
 async create(owner,name){if(typeof name!=='string'||!name.trim()||name.length>100)throw fail('请输入 1–100 字的项目名');return change(s=>{if(s.filter(r=>r.ownerId===owner).length>=10)throw fail('每个账号最多 10 个代码工作区');const r={id:randomUUID(),ownerId:owner,name:name.trim(),files:{'README.md':'# '+name.trim()+'\n\n在右侧描述需求，或创建文件开始开发。\n'},revision:randomUUID(),updatedAt:new Date().toISOString(),history:[],jobs:[]};s.unshift(r);return r})},
 async edit(owner,id,files,expectedRevision,internal=false){validateFiles(files);if(active.has(id)&&!internal)throw fail('任务执行中，暂不能修改文件',409);return change(s=>{const r=find(s,owner,id);if(JSON.stringify(r.files)===JSON.stringify(files))return r;if(expectedRevision&&r.revision!==expectedRevision)throw fail('工作区已更新，请重新载入',409);r.history.unshift({id:randomUUID(),files:r.files,createdAt:r.updatedAt});r.history=r.history.slice(0,20);r.files=structuredClone(files);r.revision=randomUUID();r.updatedAt=new Date().toISOString();return r})},
 async rename(owner,id,name){if(active.has(id))throw fail('任务执行中，不能重命名',409);if(typeof name!=='string'||!name.trim()||name.length>100)throw fail('请输入有效项目名');return change(s=>{const r=find(s,owner,id);r.name=name.trim();r.updatedAt=new Date().toISOString();return r})},
 async remove(owner,id){if(active.has(id))throw fail('请先停止运行中的任务',409);return change(s=>{const r=find(s,owner,id);s.splice(s.indexOf(r),1);return {ok:true}})},
 async restore(owner,id,versionId){if(active.has(id))throw fail('任务执行中，不能恢复版本',409);return change(s=>{const r=find(s,owner,id),v=r.history.find(v=>v.id===versionId);if(!v)throw fail('版本不存在',404);const old={id:randomUUID(),files:r.files,createdAt:r.updatedAt};r.files=structuredClone(v.files);r.history=[old,...r.history].slice(0,20);r.revision=randomUUID();r.updatedAt=new Date().toISOString();return r})},
 async start(owner,id,prompt,kind){get(owner,id);if(active.has(id))throw fail('该工作区已有运行任务',409);if(active.size>=2)throw fail('执行服务繁忙，请稍后重试',429);active.add(id);try{return await change(s=>{const r=find(s,owner,id),job={id:randomUUID(),kind,prompt,status:'running',createdAt:new Date().toISOString(),events:[],summary:''};r.jobs.unshift(job);r.jobs=r.jobs.slice(0,15);return job})}catch(e){active.delete(id);throw e}},
 async event(owner,id,jobId,event){return change(s=>{const r=find(s,owner,id),j=r.jobs.find(j=>j.id===jobId);if(!j)throw fail('任务不存在',404);const bounded=structuredClone(event);const output=bounded.result||bounded;for(const key of ['stdout','stderr','content'])if(typeof output[key]==='string'&&output[key].length>8000){output[key]=output[key].slice(-8000);output.truncated=true}if(JSON.stringify(bounded).length>20000){bounded.result={preview:JSON.stringify(bounded.result||bounded).slice(0,16000),truncated:true}}j.events.push({...bounded,createdAt:new Date().toISOString()});j.events=j.events.slice(-30);return j})},
 async finish(owner,id,jobId,status,summary){try{return await change(s=>{const j=find(s,owner,id).jobs.find(j=>j.id===jobId);j.status=status;j.summary=String(summary).slice(0,8000);j.finishedAt=new Date().toISOString();return j})}finally{active.delete(id)}}
 };
}
