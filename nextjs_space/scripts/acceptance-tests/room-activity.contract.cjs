const assert=require('node:assert/strict'),load=require('./module-loader.cjs')
let passed=0
const check=fn=>{fn();passed++}
const math=load('lib/room-activity-math.ts')
const base=new Date('2026-10-13T12:00:00Z'),at=seconds=>new Date(base.getTime()+seconds*1000)
const span=(user,visit,seat,start,last,end=null)=>({userId:user,visitId:visit,seatIndex:seat,startedAt:at(start),lastSeenAt:at(last),endedAt:end===null?null:at(end)})
const stats=math.activityTotals([span('a','v1',-1,0,10,10),span('a','v1',2,10,40,40),span('a','v2',-1,50,80,80),span('b','v3',1,0,20)],at(0),at(200))
check(()=>assert.equal(stats.totalVisits,3));check(()=>assert.equal(stats.uniqueVisitors,2));check(()=>assert.equal(stats.returnVisits,1));check(()=>assert.equal(stats.totalDwellSeconds,150));check(()=>assert.equal(stats.seatSeconds,110))
check(()=>assert.equal(math.spanEnd(span('b','v',1,0,20),at(200)).getTime(),at(80).getTime()))
check(()=>assert.equal(math.activityTotals([span('a','v',0,0,90,90)],at(30),at(60)).totalDwellSeconds,30))
let sessions=[],spans=[],presences=[],isActive=true,seq=0
const db={
 $queryRawUnsafe:async()=>{},chatRoom:{findUnique:async()=>({ownerId:'owner',isActive})},chatPresence:{findMany:async()=>presences.filter(p=>p.lastSeen>new Date(Date.now()-60000))},
 roomActivitySession:{
 findUnique:async({where})=>sessions.find(s=>s.openKey===where.openKey)||null,
 create:async({data})=>{const r={id:'s'+ ++seq,endedAt:null,closureReport:null,...data};sessions.push(r);return r},
 update:async({where,data})=>Object.assign(sessions.find(s=>s.id===where.id),data),
 },
 roomActivitySpan:{
 findMany:async({where})=>spans.filter(s=>(!where.sessionId||s.sessionId===where.sessionId)&&(!Object.prototype.hasOwnProperty.call(where,'endedAt')||s.endedAt===where.endedAt)),
 create:async({data})=>{if(spans.some(s=>s.openKey===data.openKey&&s.openKey))throw Error('duplicate open span');const r={id:'p'+ ++seq,endedAt:null,...data};spans.push(r);return r},
 update:async({where,data})=>Object.assign(spans.find(s=>s.id===where.id),data),
 },chatRoomGift:{findMany:async()=>[{totalPrice:0,pointAmount:100,ownerAmount:0,receiverAmount:0,commissionAmount:0,recipientId:'owner'}]},
 $transaction:async fn=>fn(db),
}
const activity=load('lib/room-activity.ts',{'@/lib/db':{prisma:db},'@/lib/room-activity-math':math,'@/lib/gift-points':load('lib/gift-points.ts',{'@/lib/db':{}})})
async function main(){
 presences=[{userId:'a',seatIndex:-1,lastSeen:new Date()}]
 await activity.syncRoomActivity('r')
 check(()=>assert.equal(sessions.length,1));check(()=>assert.equal(spans.length,1))
 const firstVisit=spans[0].visitId
 presences[0].lastSeen=new Date();await activity.syncRoomActivity('r')
 check(()=>assert.equal(spans.length,1))
 presences[0].seatIndex=2;presences[0].lastSeen=new Date();await activity.syncRoomActivity('r')
 check(()=>assert.equal(spans.length,2));check(()=>assert.equal(spans[1].visitId,firstVisit));check(()=>assert.equal(spans[0].endReason,'seat_changed'))
 presences=[];await activity.syncRoomActivity('r','a')
 check(()=>assert.ok(sessions[0].endedAt));check(()=>assert.equal(sessions[0].closureReport.totalVisits,1));check(()=>assert.equal(sessions[0].closureReport.giftPointTotal,100));check(()=>assert.equal(sessions[0].closureReport.grossGiftJeton,0))
 const closed=JSON.stringify(sessions[0].closureReport);await activity.syncRoomActivity('r');check(()=>assert.equal(JSON.stringify(sessions[0].closureReport),closed))
 presences=[{userId:'a',seatIndex:0,lastSeen:new Date()}];await activity.syncRoomActivity('r')
 check(()=>assert.equal(sessions.length,2));check(()=>assert.notEqual(spans[2].visitId,firstVisit))
 // A force-close with no explicit leave is capped at the persisted heartbeat TTL.
 spans[2].startedAt=new Date(Date.now()-120000);spans[2].lastSeenAt=new Date(Date.now()-90000)
 presences=[];await activity.syncRoomActivity('r')
 check(()=>assert.equal(spans[2].endedAt.getTime(),spans[2].lastSeenAt.getTime()+60000))
 check(()=>assert.ok(sessions[1].endedAt))
 presences=[{userId:'b',seatIndex:1,lastSeen:new Date()}];await activity.syncRoomActivity('r')
 isActive=false;await activity.syncRoomActivity('r');check(()=>assert.equal(spans.at(-1).endReason,'room_closed'));check(()=>assert.ok(sessions.at(-1).closureReport))
 console.log(`PASS ${passed} isolated persistent activity lifecycle and duration checks; no production writes or actual lock concurrency.`)
}
main().catch(e=>{console.error(e);process.exitCode=1})
