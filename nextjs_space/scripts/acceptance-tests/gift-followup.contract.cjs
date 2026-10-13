const assert = require('node:assert/strict'), load = require('./module-loader.cjs')
let passed = 0
function check(fn) { fn(); passed++ }
const json = (body,init={}) => ({ body, status: init.status || 200, headers: init.headers })
const server = { NextResponse: { json } }
async function main() {
  const dates = load('lib/report-filters.ts')
  const d = dates.parseReportDates(new URLSearchParams('from=2026-10-13&to=2026-10-13'))
  check(() => assert.equal(d.gte.toISOString(),'2026-10-12T21:00:00.000Z'))
  check(() => assert.equal(d.lt.toISOString(),'2026-10-13T21:00:00.000Z'))
  for (const q of ['from=2026-02-30','from=wrong','from=2026-11-01&to=2026-10-01']) check(() => assert.throws(() => dates.parseReportDates(new URLSearchParams(q))))
  check(() => assert.equal(dates.parseReportDates(new URLSearchParams()),undefined))
  const pkSeries = load('lib/pk-series.ts')
  const match = load('lib/pk-match.ts',{'@/lib/db':{},'@/lib/pk-series':pkSeries})
  const battle = { id:'b',user1Id:'a',user2Id:'b',status:'completed',score1:1000,score2:50,winnerId:'b',arrows1:1,arrows2:2,targetArrows:2 }
  check(() => assert.equal(match.serializePkMatch(battle,new Map()).result,'guest'))
  check(() => assert.equal(match.serializePkMatch({...battle,winnerId:null,endReason:'MANUAL'},new Map()).result,null))
  check(() => assert.equal(match.serializePkMatch({...battle,winnerId:null,isDraw:true},new Map()).result,'draw'))
  check(() => assert.equal(match.serializePkMatch(battle,new Map()).targetArrows,2))
  check(() => assert.equal(match.serializePkMatch({...battle,status:'active',endsAt:new Date(0)},new Map()).finalSprint,false))
  let finalized = false, queried = false
  const dbPK = { pKBattle: { findFirst: async () => { queried = true; assert.ok(finalized); return null } }, videoStream: { findFirst: async () => ({id:'room'}) } }
  const pkDeps = {
    '@/lib/db':{__esModule:true,default:dbPK},'next/server':server,
    '@/lib/pk-state':{finalizeExpiredActivePKs:async ids => { assert.deepEqual(ids,['room']); finalized=true },PK_LIVE_STATUSES:['pending','starting','active','paused']},
    '@/lib/pk-series':pkSeries,'@/lib/pk-expiry':{expireAllStalePKs:async()=>{}},
    '@/lib/mobile-auth':{},'@/lib/notify':{},'@/lib/chat-events':{},'@/lib/stream-events':{},'@/lib/voice-room-events':{},'@/lib/check-feature':{},'@/lib/rate-limit-guard':{},'@/lib/idempotency':{},
  }
  for (const file of ['app/api/live/pk/route.ts','app/api/video-streams/[streamId]/pk-battle/route.ts']) {
    finalized=false;queried=false
    const route=load(file,pkDeps)
    await route.GET({nextUrl:new URL('https://example.test/api?roomId=room')},{params:{streamId:'room'}})
    check(() => assert.ok(finalized && queried))
  }
  finalized=false;queried=false
  await load('lib/pk-snapshot.ts',pkDeps).getPkSnapshotEvent('room')
  check(() => assert.ok(finalized && queried))
  const points=load('lib/gift-points.ts',{'@/lib/db':{}})
  const history=load('lib/admin-gift-history.ts',{'@/lib/db':{},'@/lib/gift-points':points})
  const groups=[Array.from({length:60},(_,i)=>({id:String(i).padStart(2,'0'),type:'a',createdAt:new Date(1000-i)})),[{id:'rare',type:'b',createdAt:new Date(950)}]]
  const page1=history.mergeGiftHistory(groups,0,30),page2=history.mergeGiftHistory(groups,30,30)
  check(()=>assert.equal(page1.length,30));check(()=>assert.equal(page2.length,30))
  check(()=>assert.equal(new Set([...page1,...page2].map(x=>x.type+':'+x.id)).size,60))
  check(()=>assert.ok(page2.some(x=>x.id==='rare')))

  let state, fail = null, committedButLost = false
  const reset=()=>{state={users:{sender:{jetonBalance:1000,cfcBalance:1000},recipient:{jetonBalance:50,cfcBalance:50}},txs:[],ledger:[],receipt:null,locks:[]};fail=null;committedButLost=false}
  reset()
  const db={ user: {
    findFirst:async()=>({id:'recipient',name:'Alıcı',username:'receiver'}),
    findUnique:async({where})=>({...state.users[where.id]}),
    findUniqueOrThrow:async({where})=>({...state.users[where.id]}),
    updateMany:async({where,data})=>{const f=Object.keys(data)[0];if(state.users[where.id][f]<where[f].gte)return {count:0};state.users[where.id][f]-=data[f].decrement;return {count:1}},
    update:async({where,data})=>{for(const f of Object.keys(data))state.users[where.id][f]+=data[f].increment;return state.users[where.id]},
  }, $queryRawUnsafe:async(sql,id)=>state.locks.push(id),
  jetonTransaction:{create:async({data})=>{state.txs.push(data)}},
  ledgerEntry:{createMany:async({data})=>{if(fail==='ledger')throw Error('simulated ledger failure');state.ledger.push(...data)}},
  idempotencyRecord:{
    findUnique:async()=>state.receipt,
    create:async({data})=>state.receipt={id:'receipt',createdAt:new Date(),...data},
    update:async({data})=>{if(fail==='receipt')throw Error('simulated receipt failure');state.receipt={...state.receipt,...data}},
    deleteMany:async({where})=>{if(state.receipt?.status===where.status)state.receipt=null;return {count:1}},
  },
  $transaction:async fn=>{const backup=structuredClone(state);try {const result=await fn(db);if(committedButLost)throw Object.assign(Error('commit acknowledgement lost'),{committed:true});return result}catch(e){if(!e.committed)state=backup;throw e}},
  }
  const deps={ 'next/server':server,'@/lib/db':{__esModule:true,default:db,prisma:db},uuid:{v4:()=> 'tx'},
    '@/lib/mobile-auth':{authenticateRequest:async()=>({id:'sender',name:'Gönderen'})},
    '@/lib/agency-commission':{getPlatformSetting:async key=>key.endsWith('_min')?'100':'10'},
    '@/lib/rate-limiter':{heavyLimiter:{check:()=>({success:true})}},
    '@/lib/notify':{createNotificationWithPush:()=>Promise.resolve()},
  }
  deps['@/lib/idempotency']=load('lib/idempotency.ts',deps)
  deps['@/lib/ledger']=load('lib/ledger.ts',deps)
  deps['@/lib/gift-recipient']={lockGiftBalances:async(tx,ids)=>{for(const id of ids.sort())await tx.$queryRawUnsafe('lock',id)}}
  const route=load('app/api/wallet/transfer/route.ts',deps)
  const req=(currency='jeton',amount=100)=>({headers:new Headers({'idempotency-key':'k'}),json:async()=>({currency,amount,recipient:'recipient'})})
  const result=await route.POST(req())
  check(()=>assert.equal(result.status,200));check(()=>assert.equal(state.users.sender.jetonBalance,900));check(()=>assert.equal(state.users.recipient.jetonBalance,140))
  check(()=>assert.equal(state.txs[1].balanceBefore,50));check(()=>assert.equal(state.txs[1].balanceAfter,140))
  check(()=>assert.equal(state.ledger.filter(r=>r.direction==='credit').reduce((s,r)=>s+r.amount,0),100))
  check(()=>assert.equal(state.receipt.status,'completed'))
  const replay=await route.POST(req());check(()=>assert.equal(replay.headers['Idempotent-Replay'],'true'));check(()=>assert.equal(state.users.sender.jetonBalance,900))
  await deps['@/lib/idempotency'].releaseIdempotent('receipt');check(()=>assert.equal(state.receipt.status,'completed'))
  reset();await route.POST(req('cfc'));check(()=>assert.equal(state.users.sender.cfcBalance,900));check(()=>assert.equal(state.users.recipient.cfcBalance,140));check(()=>assert.equal(state.txs.length,0))
  for(const fault of ['ledger','receipt']) {reset();fail=fault;const r=await route.POST(req());check(()=>assert.equal(r.status,500));check(()=>assert.equal(state.users.sender.jetonBalance,1000));check(()=>assert.equal(state.users.recipient.jetonBalance,50));check(()=>assert.equal(state.ledger.length,0))}
  reset();check(()=>assert.equal(state.receipt,null));check(()=>assert.equal(state.users.sender.jetonBalance,1000))
  const insufficient=await route.POST(req('jeton',2000));check(()=>assert.equal(insufficient.status,400));check(()=>assert.equal(state.users.sender.jetonBalance,1000))
  for(const amount of [100.5,-1,2147483648]) {reset();const r=await route.POST(req('jeton',amount));check(()=>assert.equal(r.status,400));check(()=>assert.equal(state.ledger.length,0))}
  reset();committedButLost=true
  const lost=await route.POST(req());check(()=>assert.equal(lost.status,500));check(()=>assert.equal(state.receipt.status,'completed'))
  const recovered=await route.POST(req());check(()=>assert.equal(recovered.status,200));check(()=>assert.equal(state.users.sender.jetonBalance,900))
  console.log(`PASS ${passed} isolated PK alias/serialization, filters, pagination and transfer contract checks; no production writes.`)
}
main().catch(e=>{console.error(e);process.exitCode=1})
