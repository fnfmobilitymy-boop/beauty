import {loadDocument,saveDocument,acquireAppLease} from './storage.mjs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const directory=process.env.KD_DATA_DIR?pathToFileURL(resolve(process.env.KD_DATA_DIR)+'/'):new URL('./data/',import.meta.url);const [command,providedId]=process.argv.slice(2);let id=providedId;const users=await loadDocument(directory,'users.json',[]);
if(command==='select'){if(!users.length)throw Error('请先在网站注册账号，再设置管理员');const {createInterface}=await import('node:readline/promises');const terminal=createInterface({input:process.stdin,output:process.stdout});try{users.forEach((u,i)=>console.log((i+1)+'. '+u.email));const number=Number(await terminal.question('Select your account number: '));if(!Number.isInteger(number)||number<1||number>users.length)throw Error('账号编号无效');const user=users[number-1];if((await terminal.question('Grant admin to '+user.email+'? Type YES: ')).trim()!=='YES')throw Error('管理员设置已取消');id=user.id}finally{terminal.close()}}
if(command==='list'){for(const user of users)console.log(user.id+'  '+user.email)}
else if(command==='bind'||command==='select'){if(!users.some(u=>u.id===id))throw Error('账号 ID 不存在，请先注册，然后用 list 查看账号 ID');const release=await acquireAppLease(directory);try{const roles=await loadDocument(directory,'admin-roles.json',{ids:[]});if(!roles.ids.includes(id))roles.ids.push(id);await saveDocument(directory,'admin-roles.json',roles);console.log('管理员绑定完成；启动应用后生效')}finally{release()}}
else throw Error('Usage: node admin-cli.mjs list | bind <existing-account-id>');
