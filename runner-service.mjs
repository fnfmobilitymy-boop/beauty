import {mkdir,lstat,unlink,chmod,chown} from 'node:fs/promises';
import {dirname} from 'node:path';
import net from 'node:net';
import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {createPreviewManager} from './coding-preview.mjs';
import {runLocalSandbox} from './coding-sandbox.mjs';
const token=process.env.KD_RUNNER_TOKEN;
if(!token||token.length<32)throw Error('KD_RUNNER_TOKEN must be configured with at least 32 characters');
let active=0;const previews=createPreviewManager();
const service=http.createServer(async(req,res)=>{const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
 if(req.url==='/health'&&req.method==='GET')return send(200,{status:'ok'});
 if((req.url!=='/run'&&!['/previews/start','/previews/request','/previews/logs','/previews/stop'].includes(req.url))||req.method!=='POST')return send(404,{error:'Not found'});
 const value=Buffer.from(req.headers.authorization||''),expected=Buffer.from('Bearer '+token);if(value.length!==expected.length||!timingSafeEqual(value,expected))return send(401,{error:'Runner authentication required'});
 if(active>=(req.url==='/previews/request'?24:2))return send(429,{error:'Runner busy'});active++;
 try{let text='';for await(const c of req){text+=c;if(text.length>1000000)throw Object.assign(Error('Request too large'),{status:413})}let input;try{input=JSON.parse(text)}catch{throw Object.assign(Error('Invalid JSON'),{status:400})}if(req.url.startsWith('/previews/')){const action=req.url.split('/').pop();const result=action==='start'?await previews.start(input.files,input.command,input.port):action==='request'?await previews.request(input.id,input.request):await previews[action](input.id);return send(200,result||{ok:true})}const controller=new AbortController();res.on('close',()=>{if(!res.writableEnded)controller.abort()});const result=await runLocalSandbox(input.files,input.command,{signal:controller.signal});send(200,result)}catch(e){send(e.status||500,{error:e.message})}finally{active--}
});
const socket=process.env.KD_RUNNER_SOCKET;
if(socket){await mkdir(dirname(socket),{recursive:true});try{const item=await lstat(socket);if(!item.isSocket())throw Error('Runner socket path is occupied');const activeSocket=await new Promise((resolve,reject)=>{const s=net.connect(socket);s.once('connect',()=>{s.end();resolve(true)});s.once('error',e=>['ECONNREFUSED','ENOENT'].includes(e.code)?resolve(false):reject(e))});if(activeSocket)throw Error('Another runner is already using this socket');await unlink(socket).catch(e=>{if(e.code!=='ENOENT')throw e})}catch(e){if(e.code!=='ENOENT')throw e}await new Promise((resolve,reject)=>{service.once('error',reject);service.listen(socket,resolve)});if(process.env.KD_RUNNER_SOCKET_GROUP){await chown(socket,process.getuid(),Number(process.env.KD_RUNNER_SOCKET_GROUP));await chmod(socket,0o660)}else await chmod(socket,0o600);console.log('Isolated runner listening on local socket')}
else service.listen(process.env.KD_RUNNER_PORT||4000,'0.0.0.0',function(){console.log('Isolated runner listening on '+this.address().port)});
let stopping=false;async function stop(){if(stopping)return;stopping=true;service.close();await previews.close();process.exit(0)}process.on('SIGTERM',stop);process.on('SIGINT',stop);
