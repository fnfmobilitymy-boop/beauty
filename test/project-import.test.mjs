import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deflateRawSync} from 'node:zlib';
import {exportProjectZip,importProjectZip} from '../coding-export.mjs';
test('project ZIP import validates paths, checksums, size and deflate data',async()=>{
 const files={'src/main.mjs':'console.log("hello")','README.md':'中文说明'};assert.deepEqual(await importProjectZip(exportProjectZip(files)),files);
 const traversal=Buffer.from(exportProjectZip({'safe.txt':'text'}));for(let i=0;i<traversal.length-8;i++)if(traversal.subarray(i,i+8).toString()==='safe.txt')traversal.write('../x.txt',i);await assert.rejects(importProjectZip(traversal),/路径/);
 const damaged=Buffer.from(exportProjectZip({'safe.txt':'text'}));damaged[38]^=1;await assert.rejects(importProjectZip(damaged),/校验/);
 const text='safe compressed data '.repeat(500),original=exportProjectZip({'safe.txt':text}),oldEnd=original.length-22,centralStart=original.readUInt32LE(oldEnd+16),header=Buffer.from(original.subarray(0,38)),directory=Buffer.from(original.subarray(centralStart,oldEnd)),end=Buffer.from(original.subarray(oldEnd)),compressed=deflateRawSync(Buffer.from(text));header.writeUInt16LE(8,8);header.writeUInt32LE(compressed.length,18);directory.writeUInt16LE(8,10);directory.writeUInt32LE(compressed.length,20);end.writeUInt32LE(header.length+compressed.length,16);const deflated=Buffer.concat([header,compressed,directory,end]);assert.equal((await importProjectZip(deflated))['safe.txt'],text);
 const bomb=Buffer.from(deflated);bomb.writeUInt32LE(500001,header.length+compressed.length+24);await assert.rejects(importProjectZip(bomb),/超过/);
 await assert.rejects(importProjectZip(Buffer.alloc(22)),/目录/);
});
