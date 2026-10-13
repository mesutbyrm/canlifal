const fs = require('fs'), ts = require('typescript'), vm = require('vm'), assert = require('assert/strict'), path = require('path')
const file = path.resolve(__dirname,'../../lib/pk-series.ts')
const code = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
const mod={exports:{}}; vm.runInThisContext('(function(exports,module){'+code+'})')(mod.exports,mod)
const {parseTargetArrows,advancePkRound,pkSeriesFields}=mod.exports
let count=0; const check=(value,message)=>{assert.ok(value,message);count++}
for(const target of [1,2,3]) {
 let b={targetArrows:target,score1:0,score2:0,user1Id:'a',user2Id:'b',duration:60,status:'active'}
 for(let i=1;i<=target;i++) {
  b.score1+=100;b.score2+=20
  b={...b,...advancePkRound(b,'TIME_UP',new Date('2026-10-13T12:00:00Z'))}
  check(b.arrows1===i,'one arrow per winning round')
  check(b.status===(i===target?'completed':'active'),'target enforced')
  check(b.score1===100*i,'financial/gift totals never reset')
 }
 check(b.winnerId==='a','winner chosen server-side')
 check(b.roundHistory.length===target,'all rounds persisted')
}
let b={targetArrows:3,score1:100,score2:100,user1Id:'a',user2Id:'b',duration:60}
let n=advancePkRound(b,'TIME_UP',new Date())
check(n.status==='active'&&n.arrows1===0&&n.arrows2===0,'tie no arrow, next round')
for(const reason of ['MANUAL','HOST_LEFT','ROOM_CLOSED','LIVE_ENDED','CONNECTION_LOST']) {
 n=advancePkRound(b,reason,new Date());check(n.status==='completed'&&n.winnerId===null&&n.endReason===reason,'explicit end without fabricated winner')
}
for(const v of [0,4,-1,1.5,'2',{}]) check(parseTargetArrows(v)===null,'invalid rule rejected')
check(parseTargetArrows(undefined)===1,'legacy default')
check(pkSeriesFields({}).roundNumber===1,'legacy snapshot')
console.log(`PASS ${count} PK series checks; pure logic, no device or database writes.`)
