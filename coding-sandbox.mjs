import {runnerRequest} from './runner-client.mjs';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
export function validateFiles(files){
 if(!files||typeof files!=='object'||Array.isArray(files)||Object.keys(files).length>80)throw Object.assign(Error('最多支持 80 个文本文件'),{status:400});let bytes=0;
 for(const [path,content] of Object.entries(files)){if(!/^[A-Za-z0-9_@./-]{1,180}$/.test(path)||path.startsWith('/')||path.split('/').some(p=>!p||p==='.'||p==='..'||p==='.git'||p==='node_modules')||typeof content!=='string'||content.includes('\0'))throw Object.assign(Error('文件路径或内容无效'),{status:400});bytes+=Buffer.byteLength(content)}
 if(bytes>500000)throw Object.assign(Error('项目文本总量不能超过 500 KB'),{status:413});return files;
}
const wrapper=String.raw`
const fs=require('fs'),path=require('path'),{spawn}=require('child_process');let input='';process.stdin.on('data',c=>input+=c);process.stdin.on('end',()=>{const data=JSON.parse(input);for(const [name,content]of Object.entries(data.files)){const target=path.join('/work',name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content)}if(fs.existsSync('/opt/deps/node_modules'))fs.symlinkSync('/opt/deps/node_modules','/work/node_modules');let stdout='',stderr='',timedOut=false;const append=(value,chunk)=>(value+chunk).slice(-32000);const child=spawn('/bin/sh',['-c',data.command],{cwd:'/work',detached:true,env:{PATH:process.env.PATH,HOME:'/tmp',TMPDIR:'/tmp',CI:'1',npm_config_cache:'/tmp/npm-cache',npm_config_offline:'true'}});child.stdout.on('data',c=>stdout=append(stdout,c));child.stderr.on('data',c=>stderr=append(stderr,c));const timer=setTimeout(()=>{timedOut=true;try{process.kill(-child.pid,'SIGKILL')}catch{}},25000);child.on('error',e=>stderr=append(stderr,e.message));child.on('close',code=>{clearTimeout(timer);try{process.kill(-child.pid,'SIGKILL')}catch{}const files={};let total=0;function walk(dir){for(const name of fs.readdirSync(dir)){if(name==='node_modules'||name==='.git')continue;const full=path.join(dir,name),s=fs.lstatSync(full);if(s.isSymbolicLink())continue;if(s.isDirectory()){if(full.split('/').length<15)walk(full)}else if(s.isFile()&&s.size<=500000){const relative=path.relative('/work',full),text=fs.readFileSync(full);if(text.includes(0))continue;total+=text.length;if(total>500000||Object.keys(files).length>=80)throw Error('输出项目超过文件限制');files[relative]=text.toString('utf8')}}}try{walk('/work');console.log(JSON.stringify({exitCode:code??1,timedOut,stdout,stderr,files}))}catch(e){console.log(JSON.stringify({exitCode:1,timedOut,stdout,stderr:stderr+'\n'+e.message,files:null}))}})});
`;
export async function runLocalSandbox(files,command,{signal}={}){
 signal?.throwIfAborted();
 validateFiles(files);if(typeof command!=='string'||!command.trim()||command.length>4000)throw Object.assign(Error('命令不能为空，且不能超过 4000 字符'),{status:400});
 const name='kd-job-'+randomUUID();
 const args=['--host=unix:///var/run/docker.sock','run','--rm','--pull=never','--name',name,'--network=none','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--memory=256m','--memory-swap=256m','--cpus=1','--pids-limit=64','--ulimit','nofile=256:256','--user=1000:1000','--tmpfs','/work:rw,nosuid,nodev,size=32m,uid=1000,gid=1000','--tmpfs','/tmp:rw,nosuid,nodev,size=32m,uid=1000,gid=1000','-e','HTTP_PROXY=','-e','HTTPS_PROXY=','-e','http_proxy=','-e','https_proxy=','-e','ALL_PROXY=','-e','all_proxy=','-i',process.env.KD_SANDBOX_IMAGE||'kd-runtime:local','node','-e',wrapper];
 return await new Promise((resolve,reject)=>{
  const env={PATH:process.env.PATH,HOME:process.env.HOME,DOCKER_CONFIG:process.env.DOCKER_CONFIG};const child=spawn('docker',args,{env,stdio:['pipe','pipe','pipe']});let output='',error='',finished=false;
  const cleanup=()=>{const c=spawn('docker',['--host=unix:///var/run/docker.sock','rm','-f',name],{env,stdio:'ignore'});c.on('error',()=>{})};
  const timer=setTimeout(()=>{child.kill('SIGKILL');cleanup();if(!finished){finished=true;reject(Object.assign(Error('隔离执行超时，任务已终止'),{status:504}))}},35000);
  const abort=()=>{clearTimeout(timer);child.kill('SIGKILL');cleanup();if(!finished){finished=true;reject(Object.assign(Error('任务已取消'),{name:'AbortError'}))}};signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  child.stdin.on('error',()=>{});child.stdout.on('data',c=>{output+=c;if(output.length>2000000){child.kill('SIGKILL');cleanup()}});child.stderr.on('data',c=>error=(error+c).slice(-2000));child.on('error',()=>{clearTimeout(timer);if(!finished){finished=true;reject(Object.assign(Error('隔离运行服务不可用，请检查 Docker 配置'),{status:503}))}});
  child.on('close',code=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);if(finished)return;finished=true;if(code!==0)return reject(Object.assign(Error('容器执行失败：'+error.slice(-500)),{status:503}));try{const result=JSON.parse(output);if(result.files)validateFiles(result.files);resolve(result)}catch{reject(Object.assign(Error('隔离执行结果无效'),{status:502}))}});child.stdin.end(JSON.stringify({files,command}));
 });
}

export async function runSandbox(files,command,{signal}={}){
 signal?.throwIfAborted();if(!process.env.KD_RUNNER_URL&&!process.env.KD_RUNNER_SOCKET)return runLocalSandbox(files,command,{signal});validateFiles(files);const data=await runnerRequest('/run',{files,command},{signal,timeout:40000,maxBytes:2000000});if(!Number.isInteger(data.exitCode)||typeof data.stdout!=='string'||typeof data.stderr!=='string')throw Object.assign(Error('运行器响应无效'),{status:502});if(data.files)validateFiles(data.files);return data;
}
