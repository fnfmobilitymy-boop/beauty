import {loadDocument,saveDocument} from './storage.mjs';
import {randomBytes,scrypt as derive,timingSafeEqual,createHash,randomUUID} from 'node:crypto';
import {promisify} from 'node:util';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
const scrypt=promisify(derive);
export async function createAuth(directory){
 await mkdir(directory,{recursive:true});const file=new URL('users.json',directory);let users=[];users=await loadDocument(directory,'users.json',[])
 const sessions=new Map(),attempts=new Map();let queue=Promise.resolve();
 const publicUser=u=>({id:u.id,email:u.email});
 function cookie(req){const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('kd_session='))?.slice(11);return token?createHash('sha256').update(token).digest('hex'):null}
 function current(req){const key=cookie(req),s=sessions.get(key);if(!s||s.expires<Date.now()){sessions.delete(key);return null}return users.find(u=>u.id===s.userId)||null}
 function setSession(req,res,u){const token=randomBytes(32).toString('hex');const key=createHash('sha256').update(token).digest('hex');for(const [k,v] of sessions)if(v.expires<Date.now())sessions.delete(k);sessions.set(key,{userId:u.id,createdAt:Date.now(),expires:Date.now()+86400000});res.setHeader('Set-Cookie',`kd_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${(req.socket.encrypted||process.env.KD_SECURE_COOKIES==='enabled')?'; Secure':''}`);return publicUser(u)}
 async function register(email,password){email=typeof email==='string'?email.trim().toLowerCase():'';if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||typeof password!=='string'||password.length<12||password.length>128)throw Object.assign(Error('请输入有效邮箱，密码须为 12–128 个字符'),{status:400});const salt=randomBytes(16).toString('hex');const hash=(await scrypt(password,salt,64)).toString('hex');const task=queue.then(async()=>{if(users.some(u=>u.email===email))throw Object.assign(Error('无法注册此邮箱，请尝试登录'),{status:409});const u={id:randomUUID(),email,salt,hash};const next=[...users,u];await saveDocument(directory,'users.json',next);users=next;return u});queue=task.catch(()=>{});return task}
 async function login(email,password){const u=users.find(u=>u.email===String(email).trim().toLowerCase());const hash=await scrypt(typeof password==='string'?password.slice(0,128):'',u?.salt||'00000000000000000000000000000000',64);if(typeof password!=='string'||password.length>128||!u||users.find(x=>x.id===u.id)?.hash!==u.hash||!timingSafeEqual(hash,Buffer.from(u.hash,'hex')))throw Object.assign(Error('邮箱或密码错误'),{status:401});return u}
 function limited(req){const key=req.socket.remoteAddress;const now=Date.now();for(const [k,v] of attempts)if(now-v.time>600000)attempts.delete(k);const entry=attempts.get(key)||{time:now,count:0};entry.count++;attempts.set(key,entry);return entry.count>20}
 function logout(req,res){sessions.delete(cookie(req));res.setHeader('Set-Cookie','kd_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0')}

 async function changePassword(userId,currentPassword,newPassword){
  if(typeof newPassword!=='string'||newPassword.length<12||newPassword.length>128)throw Object.assign(Error('新密码须为 12–128 个字符'),{status:400});
  const task=queue.then(async()=>{
   const u=users.find(x=>x.id===userId);if(!u)throw Object.assign(Error('请重新登录'),{status:401});
   const candidate=await scrypt(typeof currentPassword==='string'?currentPassword.slice(0,128):'',u.salt,64);
   if(typeof currentPassword!=='string'||currentPassword.length>128||!timingSafeEqual(candidate,Buffer.from(u.hash,'hex')))throw Object.assign(Error('当前密码错误'),{status:400});
   if(currentPassword===newPassword)throw Object.assign(Error('新密码不能与当前密码相同'),{status:400});
   const salt=randomBytes(16).toString('hex'),hash=(await scrypt(newPassword,salt,64)).toString('hex');
   const updated={...u,salt,hash},next=users.map(x=>x.id===u.id?updated:x);
   await saveDocument(directory,'users.json',next);users=next;
   for(const [key,session] of sessions)if(session.userId===u.id)sessions.delete(key);
   return updated;
  });queue=task.catch(()=>{});return task;
 }
 function listSessions(req,userId){const now=Date.now();for(const [key,s] of sessions)if(s.expires<=now)sessions.delete(key);return [...sessions.entries()].filter(([,s])=>s.userId===userId).map(([key,s])=>({current:key===cookie(req),createdAt:new Date(s.createdAt).toISOString(),expiresAt:new Date(s.expires).toISOString()}))}
 function revokeOthers(req,userId){let count=0;for(const [key,s] of sessions)if(s.userId===userId&&key!==cookie(req)){sessions.delete(key);count++}return count}
 function reviewAuthorized(req){return (sessions.get(cookie(req))?.reviewUntil||0)>Date.now()}
 async function unlockReview(req,password){const u=current(req);if(!u)throw Object.assign(Error('请先登录'),{status:401});await login(u.email,password);const session=sessions.get(cookie(req));if(!session)throw Object.assign(Error('请重新登录'),{status:401});session.reviewUntil=Date.now()+10*60000}
 return {listUsers:()=>users.map(publicUser),reviewAuthorized,unlockReview,changePassword,listSessions,revokeOthers,current,register,login,setSession,logout,limited,publicUser};
}
