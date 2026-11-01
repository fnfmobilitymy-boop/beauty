import {loadDocument,saveDocument} from './storage.mjs';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {creditPackages} from './credits.mjs';
const error=(message,status=400)=>Object.assign(Error(message),{status});
export async function createQuotes(directory){
 let state={rates:{USDT:null,USD:null},quotes:[],rateHistory:[]};const file=new URL('recharge-quotes.json',directory);state=await loadDocument(directory,'recharge-quotes.json',{rates:{USDT:null,USD:null},quotes:[],rateHistory:[]});let queue=Promise.resolve();
 function change(fn){const task=queue.then(async()=>{const next=structuredClone(state),result=fn(next);await saveDocument(directory,'recharge-quotes.json',next);state=next;return result});queue=task.catch(()=>{});return task}
 function scaled(value){const text=String(value);if(!/^\d{1,4}(?:\.\d{1,6})?$/.test(text)||Number(text)<=0)throw error('汇率必须大于 0，最多 6 位小数');const [a,b='']=text.split('.');return BigInt(a)*1000000n+BigInt(b.padEnd(6,'0'))}
 return {
 rates:()=>({...state.rates}),
 updateRates(adminId,input){return change(s=>{const next={};for(const currency of ['USDT','USD']){const value=input?.[currency];next[currency]=value===null||value===''?null:String(value);if(next[currency]!==null)scaled(next[currency])}s.rateHistory.push({adminId,previous:s.rates,next,changedAt:new Date().toISOString()});s.rates=next;return next})},
 create(ownerId,method,currency,packageId){return change(s=>{
  const pack=creditPackages.find(p=>p.id===packageId);if(!pack)throw error('请选择有效套餐');
  if(!({hlb:['MYR'],tng:['MYR'],usdt:['USDT'],stripe:['MYR','USD']}[method]||[]).includes(currency))throw error('付款方式或币种无效');
  const rate=currency==='MYR'?'1':s.rates[currency];if(!rate)throw error('该币种报价暂未设置，请选择 MYR 付款方式',503);
  // Round up to the smallest supported payment unit; never underquote a package.
  const precision=currency==='USDT'?6:2,scale=10n**BigInt(precision),cents=BigInt(pack.myr.replace('.','')),r=scaled(rate),numerator=cents*1000000n*scale,denominator=100n*r,units=(numerator+denominator-1n)/denominator;
  const amount=(units/scale).toString()+'.'+(units%scale).toString().padStart(precision,'0');
  const quote={id:randomUUID(),ownerId,method,currency,amount,rateMYR:rate,packageId:pack.id,myr:pack.myr,credits:pack.credits,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+30*60000).toISOString()};
  s.quotes=s.quotes.filter(q=>Date.parse(q.expiresAt)>Date.now());s.quotes.push(quote);return quote;
 })},
 get(ownerId,id){const q=state.quotes.find(q=>q.id===id&&q.ownerId===ownerId);if(!q)throw error('报价不存在，请重新选择套餐',404);if(Date.parse(q.expiresAt)<=Date.now())throw error('报价已过期，请刷新报价后再付款',409);return structuredClone(q)}
 };
}
