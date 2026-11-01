import {loadDocument,saveDocument,acquireAppLease} from './storage.mjs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const directory=process.env.KD_DATA_DIR?pathToFileURL(resolve(process.env.KD_DATA_DIR)+'/'):new URL('./data/',import.meta.url);const [command,id]=process.argv.slice(2);const users=await loadDocument(directory,'users.json',[]);
if(command==='list'){for(const user of users)console.log(user.id+'  '+user.email)}
else if(command==='bind'){if(!users.some(u=>u.id===id))throw Error('账号 ID 不存在，请先注册，然后用 list 查看账号 ID');const release=await acquireAppLease(directory);try{const roles=await loadDocument(directory,'admin-roles.json',{ids:[]});if(!roles.ids.includes(id))roles.ids.push(id);await saveDocument(directory,'admin-roles.json',roles);console.log('管理员绑定完成；启动应用后生效')}finally{release()}}
else throw Error('Usage: node admin-cli.mjs list | bind <existing-account-id>');
