// Executes the actual idempotency/point/ledger modules, with isolated storage.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
let existing = null, failure = null, creates = 0, rows = [], count = 0
const db = { idempotencyRecord: {
  findUnique: async () => { if(failure==='offline') throw Error('simulated offline');return existing },
  create: async ({data}) => { if(existing || failure==='race') throw Object.assign(Error('simulated race'),{code:'P2002'}); creates++;existing={id:'key',createdAt:new Date(),...data};return existing },
  update: async ({data}) => {existing={...existing,...data};return existing},
  deleteMany: async ({where}) => { if(existing?.status === where.status) existing=null; return {count:1} },
}, ledgerEntry: {createMany: async ({data}) => {if(failure) throw Error('ledger failure');rows=data}} }
const deps = {'@/lib/db':{__esModule:true,default:db,prisma:db},'next/server':{NextResponse:{json:(body,init={})=>({status:init.status||200,body,headers:init.headers})}},uuid:{v4:()=> 'test-uuid'}}
function load(file) {
  const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText
  const module={exports:{}}
  vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(key=>{if(deps[key])return deps[key];throw Error('Forbidden dependency: '+key)},module,module.exports)
  return module.exports
}
const req = key => ({headers:new Headers(key?{'Idempotency-Key':key}:{})})
;(async()=>{
  const lib=load('lib/idempotency.ts')
  const call=()=>lib.beginIdempotent(req('gift-1'),'test','sender',{strict:true})
  assert.equal((await lib.beginIdempotent(req(null),'test','sender',{strict:true})).record,null);count++
  const outcomes=await Promise.all([call(),call()])
  assert.equal(creates,1);assert.equal(outcomes.filter(o=>o.record).length,1);assert.equal(outcomes.find(o=>o.response).response.status,409);count++
  assert.equal((await call()).response.status,409);count++
  existing.createdAt=new Date(0)
  assert.equal((await call()).response.status,409);count++
  await lib.completeIdempotent('key',200,{success:true,newBalance:900})
  const replay=await call();assert.equal(replay.response.body.newBalance,900);assert.equal(creates,1);count++
  existing.expiresAt=new Date(0)
  assert.equal((await call()).response.status,409);count++
  existing=null;failure='offline'
  assert.equal((await call()).response.status,503);count++
  // Existing non-gift callers keep their legacy optional behaviour.
  assert.equal((await lib.beginIdempotent(req('legacy'),'withdrawal','sender')).record,null);count++
  failure='race';assert.equal((await call()).response.status,409);count++
  failure=null
  const points=load('lib/gift-points.ts')
  assert.equal(points.giftPointAmount({pointAmount:100,totalPrice:0}),100);count++
  assert.equal(points.giftPointAmount({pointAmount:100,totalPrice:100}),100);count++
  assert.equal(points.giftPointAmount({pointAmount:null,totalPrice:80}),80);count++
  assert.equal(points.giftPointAmount({pointAmount:null,totalPrice:0}),0);count++
  const ledger=load('lib/ledger.ts')
  await ledger.recordMultiLeg({legs:[{accountType:'user_jeton',accountId:'s',direction:'debit',amount:100},{accountType:'user_jeton',accountId:'r',direction:'credit',amount:60},{accountType:'platform_jeton',accountId:'platform',direction:'credit',amount:40}],category:'gift_send'},{client:db,strict:true})
  assert.equal(rows.length,3);assert.equal(rows.filter(r=>r.direction==='credit').reduce((s,r)=>s+r.amount,0),100);count++
  failure='ledger'
  await assert.rejects(()=>ledger.recordMultiLeg({legs:[],category:'gift_send'},{client:db,strict:true}));count++
  assert.equal(await ledger.recordMultiLeg({legs:[],category:'gift_send'}),null);count++
  console.log(`PASS ${count} isolated replay, point snapshot and strict ledger checks; no production writes.`)
})().catch(e=>{console.error(e);process.exitCode=1})
