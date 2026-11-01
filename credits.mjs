import {loadDocument,saveDocument} from './storage.mjs';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
export const creditPackages=[{id:'starter',myr:'39.00',credits:100},{id:'plus',myr:'99.00',credits:300},{id:'max',myr:'199.00',credits:700}];
const fail=(message,status=400)=>Object.assign(Error(message),{status});
export async function createCredits(directory){
 const file=new URL('credits.json',directory);let state={entries:[],decisions:{}};state=await loadDocument(directory,'credits.json',{entries:[],decisions:{}});let queue=Promise.resolve();
 const balance=(s,ownerId)=>s.entries.filter(e=>e.ownerId===ownerId).reduce((total,e)=>total+e.units,0);
 function transact(fn){const task=queue.then(async()=>{const next=structuredClone(state),result=fn(next);await saveDocument(directory,'credits.json',next);state=next;return result});queue=task.catch(()=>{});return task}
 function entry(s,data){const e={id:randomUUID(),createdAt:new Date().toISOString(),...data};s.entries.unshift(e);return e}
 return {
 audit(){return {entries:structuredClone(state.entries).map(({units,...e})=>({...e,credits:units/2})),decisions:structuredClone(state.decisions)}},
 wallet(ownerId){return {balance:balance(state,ownerId)/2,entries:state.entries.filter(e=>e.ownerId===ownerId).map(({units,...e})=>({...e,credits:units/2}))}},
 decision:id=>state.decisions[id]||null,
 review(deposit,adminId,input){return transact(s=>{
  if(!deposit)throw fail('充值申报不存在',404);
  if(s.decisions[deposit.id])throw fail('该申报已审核，请勿重复处理',409);
  if(input?.note!==undefined&&(typeof input.note!=='string'||input.note.trim().length<5||input.note.length>500))throw fail('请填写至少 5 个字符的核实说明');
  if(!['approve','reject'].includes(input.action))throw fail('审核操作无效');
  const decision={status:input.action==='approve'?'approved':'rejected',adminId,note:input.note?.trim()||(input.action==='approve'?'管理员人工核实到账并通过':'管理员拒绝申报：未核实到账'),reviewedAt:new Date().toISOString()};
  if(input.action==='approve'){
   const pack=creditPackages.find(p=>p.id===(deposit.quote?.packageId||input.packageId));
   if(deposit.quote){
    const q=deposit.quote;if(!pack||q.ownerId!==deposit.ownerId||q.amount!==deposit.amount||q.currency!==deposit.currency||q.method!==deposit.method||q.credits!==pack.credits||q.myr!==pack.myr||input.settlementVerified!==true)throw fail('报价记录无效或尚未确认到账');
    decision.quote={amount:q.amount,currency:q.currency,rateMYR:q.rateMYR,myr:q.myr,packageId:q.packageId};
   }else{
    if(deposit.currency!=='MYR')throw fail('旧申报缺少锁定报价，请核对后重新提交套餐申报');
    if(!pack||deposit.amount!==pack.myr||input.confirmedAmountMYR!==pack.myr||input.settlementVerified!==true)throw fail('须核实实际到账金额，且申报金额、实际到账金额与套餐价格一致');
   }
   entry(s,{ownerId:deposit.ownerId,units:pack.credits*2,type:'topup',depositId:deposit.id,packageId:pack.id,actorId:adminId});decision.credits=pack.credits;
  }
  s.decisions[deposit.id]=decision;return decision;
 })},
 reserve(ownerId,revision){return transact(s=>{const units=revision?1:2;if(balance(s,ownerId)<units)throw fail('Credits 不足，请先充值并等待核实到账',402);return entry(s,{ownerId,units:-units,type:'usage',status:'reserved',mode:revision?'revision':'generation'})})},
 settle(id,success){return transact(s=>{const e=s.entries.find(e=>e.id===id&&e.type==='usage');if(!e)throw fail('用量记录不存在',404);if(e.status!=='reserved')return e;e.status=success?'completed':'refunded';if(!success)entry(s,{ownerId:e.ownerId,units:-e.units,type:'refund',usageId:e.id});return e})}
 };
}
