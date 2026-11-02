export const sampleFiles={
 'package.json':JSON.stringify({name:'kd-local-demo',private:true,type:'module',scripts:{start:'node server.mjs',test:'node --test'}},null,2)+'\n',
 'README.md':'# K.D WEB 本地示例\n\n无需 AI 密钥。运行 npm test 检查后台，然后用 node server.mjs 在端口 3000 启动预览。点击网页按钮可验证前后端通信。预览数据仅保留在当前容器生命周期内。\n',
 'server.mjs':`import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
export function createServer(){let count=0;return http.createServer(async(req,res)=>{try{if(req.url==='/api/count'){if(req.method==='POST')count++;res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({count}));return}const files={'/':'index.html','/client.js':'client.js','/style.css':'style.css'};if(!files[req.url]){res.writeHead(404);res.end('Not found');return}res.setHeader('Content-Type',req.url.endsWith('.js')?'text/javascript':req.url.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(await readFile(new URL(files[req.url],import.meta.url)))}catch{res.writeHead(500);res.end('Error')}})}
if(process.argv[1]===fileURLToPath(import.meta.url))createServer().listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Local sample is running'));
`,
 'server.test.mjs':`import {test} from 'node:test';import assert from 'node:assert/strict';import {createServer} from './server.mjs';
test('API counter starts at zero and increments',async()=>{const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;try{assert.deepEqual(await(await fetch(origin+'/api/count')).json(),{count:0});assert.deepEqual(await(await fetch(origin+'/api/count',{method:'POST'})).json(),{count:1});assert.equal((await fetch(origin+'/missing')).status,404)}finally{await new Promise(r=>server.close(r))}});
`,
 'index.html':'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><title>K.D WEB 本地示例</title><main><small>K.D WEB / LOCAL DEMO</small><h1>你的前后端已连接。</h1><p>这个示例无需 AI 密钥，也不产生 AI 费用。</p><button id="add">调用后台 ＋1</button><p>后台计数：<strong id="count">读取中</strong></p><p id="error" role="status"></p></main><script src="/client.js"></script></html>',
 'client.js':"async function refresh(method='GET'){try{const r=await fetch('/api/count',{method});if(!r.ok)throw Error('请求失败');document.querySelector('#count').textContent=(await r.json()).count}catch(e){document.querySelector('#error').textContent=e.message}}document.querySelector('#add').onclick=()=>refresh('POST');refresh();\n",
 'style.css':'body{margin:0;background:#110c1b;color:#eee5ff;font:16px/1.8 Arial,sans-serif}main{max-width:700px;margin:12vh auto;padding:30px}small{color:#c69aff;letter-spacing:3px}h1{font-size:clamp(30px,6vw,54px)}p{color:#b4a4c7}button{padding:14px 24px;border:0;border-radius:10px;background:#8450c4;color:white;font:inherit;cursor:pointer}strong{color:#e7ceff}\n'
};
