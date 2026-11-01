import {loadDocument,saveDocument} from './storage.mjs';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
export const paymentMethods=[
 {id:'hlb',name:'Hong Leong Bank',currency:'MYR',holder:'WONG YUAN BAO',account:'27401009500'},
 {id:'tng',name:'Touch ’n Go eWallet',currency:'MYR',holder:'WONG YUAN BAO',account:'9988001218176'},
 {id:'usdt',name:'USDT · TRC20 (Tron)',currency:'USDT',account:'TDp1jRv52pC1bGqbpkZHmXsMEEWGdgEbNd',network:'TRC20 · Tron'},
 {id:'stripe',name:'Stripe',currency:null,url:'https://buy.stripe.com/5kQeVe7tj3vC8UceeP3oA04'}
];
export async function createDeposits(directory){
 const file=new URL('deposits.json',directory);let records=[];records=await loadDocument(directory,'deposits.json',[]);let queue=Promise.resolve();
 return {
 all:()=>records.map(r=>({...r})),
 list:ownerId=>records.filter(r=>r.ownerId===ownerId),
 async submit(ownerId,input,quote=null){
  if(quote&&(quote.ownerId!==ownerId||quote.method!==input?.method||quote.currency!==(input?.method==='stripe'?input.currency:paymentMethods.find(m=>m.id===input?.method)?.currency)))throw Object.assign(Error('报价与付款方式不匹配'),{status:400});
  const method=paymentMethods.find(m=>m.id===input?.method);
  const currency=method?.id==='stripe'?input.currency:method?.currency;
  if(method?.id==='stripe'&&!['MYR','USD'].includes(currency))throw Object.assign(Error('请按 Stripe 收据选择 MYR 或 USD；其他币种暂不支持申报。'),{status:400});
  const amount=quote?quote.amount:typeof input?.amount==='string'?input.amount.trim():'';
  const reference=typeof input?.reference==='string'?input.reference.trim():'';
  if(!method||!(method?.id==='usdt'?/^\d{1,8}(?:\.\d{1,6})?$/:/^\d{1,8}(?:\.\d{1,2})?$/).test(amount)||Number(amount)<=0||reference.length<4||reference.length>180||input?.country!=='MY')throw Object.assign(Error('请确认马来西亚用户资格，并填写有效金额和交易参考号。'),{status:400});
  if(method.id==='usdt'&&!/^[a-fA-F0-9]{64}$/.test(reference))throw Object.assign(Error('USDT 请填写 64 位十六进制链上交易哈希。'),{status:400});
  const task=queue.then(async()=>{
   if(quote&&records.some(r=>r.quote?.id===quote.id))throw Object.assign(Error('该报价已提交，请查看充值记录'),{status:409});
   if(records.some(r=>r.method===method.id&&r.reference.toLowerCase()===reference.toLowerCase()))throw Object.assign(Error('该交易参考号已申报，请勿重复提交。'),{status:409});
   const record={id:randomUUID(),ownerId,method:method.id,currency,amount:quote?quote.amount:Number(amount).toFixed(method.id==='usdt'?6:2),...(quote?{quote}:{}),reference,country:'MY',status:'pending_review',createdAt:new Date().toISOString()};
   const next=[record,...records];await saveDocument(directory,'deposits.json',next);records=next;return record;
  });queue=task.catch(()=>{});return task;
 }
 };
}
