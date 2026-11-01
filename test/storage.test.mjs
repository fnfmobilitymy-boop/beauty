import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,readFile,mkdir,copyFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {loadDocument,saveDocument,acquireAppLease,backupPlatform} from '../storage.mjs';
test('SQLite migrates legacy data, keeps originals, guards writers and creates restorable backups',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'kd-storage-')),url=pathToFileURL(dir+'/');let release;try{
 const legacy=[{id:'existing-user',email:'owner@example.com'}];await writeFile(join(dir,'users.json'),JSON.stringify(legacy));assert.deepEqual(await loadDocument(url,'users.json',[]),legacy);
 await saveDocument(url,'users.json',[...legacy,{id:'new-user'}]);assert.deepEqual(JSON.parse(await readFile(join(dir,'users.json'),'utf8')),legacy);assert.equal((await stat(join(dir,'platform.sqlite'))).mode&0o777,0o600);
 release=await acquireAppLease(url);await assert.rejects(acquireAppLease(url),/已有运行/);
 const backup=join(dir,'snapshot.sqlite');await backupPlatform(url,backup);await assert.rejects(backupPlatform(url,backup),e=>e.code==='EEXIST');
 const restored=join(dir,'restored');await mkdir(restored);await copyFile(backup,join(restored,'platform.sqlite'));const restoreURL=pathToFileURL(restored+'/');assert.equal((await loadDocument(restoreURL,'users.json',[])).length,2);const releaseRestore=await acquireAppLease(restoreURL);releaseRestore();release();release=null;const again=await acquireAppLease(url);again();
 }finally{release?.();await rm(dir,{recursive:true,force:true})}
});
