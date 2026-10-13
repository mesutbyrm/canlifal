// Isolated handler contract tests. No network, real database, credentials or production writes.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const root = path.resolve(__dirname, '../..')
let state, count = 0
const gift = { id: 'gift', name: 'Test', price: 100, isActive: true, comboEnabled: false }
const room = { id: 'room', ownerId: 'owner', roomType: 'NORMAL', nameTr: 'Test', isActive: true }
const stream = { id: 'stream', roomId: 'room', userId: 'owner', status: 'live' }
const op = fn => ({ then: (resolve, reject) => Promise.resolve().then(fn).then(resolve, reject) })
const model = name => ({
  findUniqueOrThrow: async args => ({...state.users[args.where.id]}),
  findUnique: async args => name === 'user' ? {...state.users[args.where.id]} : name === 'giftType' ? gift : name === 'chatRoom' ? room : name === 'videoStream' ? stream : name === 'liveSession' ? { id: 'session', status: 'active', userId: 'sender', tellerId: 'teller', user: state.users.sender, teller: {userId:'owner', user:state.users.owner} } : null,
  findFirst: async () => name === 'user' ? {...state.users.owner} : name === 'videoStream' ? stream : name === 'chatRoom' ? room : null,
  findMany: async () => [], count: async () => 0,
  create: args => op(() => { if (state.failGiftWrite && ['chatRoomGift','streamGift'].includes(name)) throw Error('SIMULATED_GIFT_WRITE_FAILURE'); state.rows.push({model:name,...args.data}); return {id:'record',...args.data,sender:state.users.sender,giftType:gift} }),
  update: args => op(() => {
    if (name === 'idempotencyRecord') { if (state.failReceipt) throw Error('SIMULATED_RECEIPT_FAILURE'); state.receipt = args.data.responseBody }
    if (name === 'user') for (const [key,value] of Object.entries(args.data)) state.users[args.where.id][key] += value.increment || 0
    if (name === 'liveFortuneTeller') state.teller += args.data.totalEarnings.increment
    return name === 'user' ? {...state.users[args.where.id]} : {id:'record',...args.data}
  }),
})
const db = new Proxy({}, {get: (_,name) => {
  if (name === '$transaction') return async arg => {
    const before = structuredClone(state)
    try { return await (typeof arg === 'function' ? arg(db) : Promise.all(arg)) }
    catch (e) { state = before; throw e }
  }
  if (name === '$queryRawUnsafe') return async sql => {
    if (state.rejectRecipient && !sql.includes('FROM "users"')) return []
    return sql.includes('FROM "video_streams"') ? [{userId:'owner'}] : [{id:'locked'}]
  }
  if (name === '$executeRawUnsafe') return (sql,amount,id) => op(() => {
    const field = sql.includes('"fakeJetonBalance"') ? 'fakeJetonBalance' : 'jetonBalance'
    if (state.users[id][field] < amount) throw Error('INSUFFICIENT_BALANCE')
    state.users[id][field] -= amount; return 1
  })
  return model(name)
}})
const noop = async () => null
const settings = async (key,fallback) => ({vr_platform_percent:'40',vr_owner_share_guest_gift:'25',commission_rate:'20'}[key] ?? fallback)
const mocks = {
  '@/lib/db': {__esModule:true, default:db, prisma:db},
  'next/server': {NextResponse:{json:(data,init={}) => ({status:init.status||200,json:async()=>data})}},
  'next-auth': {getServerSession:async()=>null}, '@/lib/auth-options': {authOptions:{}},
  '@/lib/mobile-auth': {authenticateRequest:async()=>state.auth ? {...state.users.sender,role:'admin'} : null},
  '@/lib/check-feature': {requireFeature:noop}, '@/lib/rate-limit-guard': {guardRateLimit:noop},
  '@/lib/rate-limiter': {heavyLimiter:{check:()=>({success:true})}},
  '@/lib/notify': {createNotificationWithPush:async()=>{if(state.failNotification) throw Error('SIMULATED_NOTIFICATION_FAILURE')}}, '@/lib/event-announcement': {triggerEventAnnouncement:noop},
  '@/lib/agency-commission': {getPlatformSetting:settings,processAgencyCommission:async p=>{state.agency.push(p)}},
  '@/lib/cache': {getCachedPlatformSetting:settings},
  '@/lib/chat-events': {emitChatEvent:(...p)=>state.events.push(p)},
  '@/lib/stream-events': {emitStreamEvent:(...p)=>state.events.push(p)},
  '@/lib/gift-render': {buildGiftRenderMeta:()=>({})}, '@/lib/media-url': {serializeGiftMedia:x=>x},
  '@/lib/ledger': {recordMultiLeg:async p=>state.ledger.push(p),recordLedger:async p=>state.ledger.push(p)},
  '@/lib/supporter-level': {recordContribution:async(...p)=>state.points.push(p)},
  '@/lib/team-points': {recordTeamPoints:noop}, '@/lib/leaderboard-engine': {incrementLeaderboardScore:noop},
  '@/lib/idempotency': {beginIdempotent:async()=>({record:state.withReceipt?'receipt':null}),completeIdempotent:noop,releaseIdempotent:noop},
  '@/lib/gift-pk-score': {publishGiftPkScore:()=>{},applyGiftPkScore:async p=>{state.pk.push(p);return null}},
  '@/lib/activity-logger': {logActivity:noop},
}
const cache = {}
function load(file) {
  if (cache[file]) return cache[file]
  const code = ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'), {compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText
  const mod = {exports:{}}; cache[file] = mod.exports
  const localRequire = key => {
    if (mocks[key]) return mocks[key]
    if (key === 'crypto') return require('crypto')
    if (['@/lib/jeton-source','@/lib/balance-guard','@/lib/voice-room-revenue','@/lib/gift-engine','@/lib/gift-recipient','@/lib/gift-settlement','@/lib/direct-gift-settlement','@/lib/voice-room-constants','@/lib/gift-points'].includes(key)) return load(key.slice(2)+'.ts')
    throw Error('Unexpected dependency (network/DB forbidden): '+key)
  }
  vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(localRequire,mod,mod.exports)
  return mod.exports
}
const cases = [
 ['chat-owner','app/api/chat/rooms/[roomId]/gifts/route.ts',{recipientId:'owner'},60],
 ['chat-guest','app/api/chat/rooms/[roomId]/gifts/route.ts',{recipientId:'guest'},60],
 ['stream','app/api/video-streams/[streamId]/gifts/route.ts',{},60],
 ['unified-stream','app/api/live/gift/send/route.ts',{roomType:'stream'},60],
 ['stream-guest','app/api/video-streams/[streamId]/gifts/route.ts',{recipientId:'guest'},60],
 ['unified-stream-guest','app/api/live/gift/send/route.ts',{roomType:'stream',recipientId:'guest'},60],
 ['unified-voice-owner','app/api/live/gift/send/route.ts',{roomType:'voice',recipientId:'owner'},60],
 ['unified-voice-guest','app/api/live/gift/send/route.ts',{roomType:'voice',recipientId:'guest'},60],
 ['direct-gift','app/api/gifts/send/route.ts',{type:'gift',recipientUsername:'owner'},100],
 ['direct-jeton','app/api/gifts/send/route.ts',{type:'jeton',jetonAmount:100,recipientUsername:'owner'},100],
 ['tip','app/api/room/[sessionId]/tip/route.ts',{amount:100},80],
]
async function run(test,role,source,balance=1000,auth=true,options={}) {
  state = {users:Object.fromEntries(['sender','owner','guest'].map(id=>[id,{id,name:id,username:id,role:id==='sender'?role:'user',jetonBalance:id==='sender'?balance:0,fakeJetonBalance:0}])),auth,rows:[],ledger:[],agency:[],points:[],events:[],pk:[],teller:0,...options}
  const [name,file,body,net] = test
  const payload = {roomId:'room',giftTypeId:'gift',quantity:1,...body,jetonSource:source,role:'admin'}
  const response = await load(file).POST({json:async()=>payload,headers:new Headers()}, {params:{roomId:'room',streamId:'stream',sessionId:'session'}})
  const data = await response.json()
  if (options.expectedStatus) {
    assert.equal(response.status,options.expectedStatus,`${name}: ${JSON.stringify(data)}`)
    assert.equal(state.users.sender.jetonBalance,balance,name+' unchanged sender')
    assert.equal(state.users.owner.jetonBalance+state.users.guest.jetonBalance,0,name+' unchanged receivers')
    assert.equal(state.rows.length,0,name+' no partial records')
    assert.equal(state.agency.length,0,name+' no commission on failure')
    count++; return
  }
  if (options.withReceipt) assert.equal(state.receipt.success,true,name+' durable receipt')
  if (options.failNotification) { assert.equal(response.status,200); assert.equal(state.users.sender.jetonBalance,balance-100); count++;return }
  const staff = ['admin','yonetici'].includes(role)
  const fake = source === 'fake' || (!source && staff)
  const ok = auth && (fake ? staff : balance>=100)
  assert.equal(response.status, !auth?401:ok?200:400, `${name}/${role}/${source}: ${JSON.stringify(data)}`)
  if (!ok) { assert.equal(state.users.sender.jetonBalance,balance); count++;return }
  assert.equal(state.users.sender.jetonBalance, fake?balance:balance-100,name)
  assert.equal(state.users.owner.jetonBalance+state.users.guest.jetonBalance+state.teller,fake?0:net,name)
  if (name.endsWith('guest')) { assert.equal(state.users.guest.jetonBalance,fake?0:45,name+' selected guest'); assert.equal(state.users.owner.jetonBalance,fake?0:15,name+' host share') }
  if (name.includes('stream') || name.startsWith('chat') || name.startsWith('unified-voice')) {
    const row = state.rows.find(r => ['streamGift','chatRoomGift'].includes(r.model))
    assert.equal(row.pointAmount,100,name+' point snapshot')
    assert.equal(row.jetonSource,fake?'fake':'real',name+' source snapshot')
  }
  assert.equal(state.points.length,1,name+' points once')
  assert.equal(state.points[0][2],100)
  if(fake) {
    assert.equal(state.ledger.length,0,name+' no financial ledger')
    assert.equal(state.agency.length,0,name+' no agency earning')
    for(const row of state.rows) for(const field of ['totalPrice','coinAmount','receiverAmount','ownerAmount','siteAmount','totalAmount','commissionAmount']) if(field in row) assert.equal(row[field],0,name+'/'+row.model+'/'+field)
    const engineEvent=state.events.find(e=>e[2]?.event==='gift_received')
    if(engineEvent) {assert.equal(engineEvent[2].pointAmount,100);assert.equal(engineEvent[2].financialAmount,0);assert.equal(engineEvent[2].jetonSource,'fake')}
  } else assert.ok(state.ledger.length>0,name+' real ledger')
  if(state.pk.length) assert.equal(state.pk[0].amount,100,name+' PK points')
  count++
}
;(async()=>{
  for(const test of cases) {
    for(const role of ['admin','yonetici']) for(const source of ['real','fake',undefined]) await run(test,role,source)
    await run(test,'admin','real',0)
    await run(test,'user','fake',0) // Body/auth role spoof must not grant staff exception.
    await run(test,'moderator','fake',0)
    await run(test,'user','real')
    await run(test,'admin','fake',1000,false)
  }
  const roomCases = cases.filter(c => c[0].includes('stream') || c[0].startsWith('chat') || c[0].startsWith('unified-voice'))
  for (const test of roomCases) {
    for (const quantity of [0,-1,1.5,101,'invalid']) await run([test[0],test[1],{...test[2],quantity},test[3]],'admin','real',1000,true,{expectedStatus:400})
    await run(test,'admin','real',1000,true,{rejectRecipient:true,expectedStatus:400})
    await run(test,'admin','real',1000,true,{failGiftWrite:true,expectedStatus:500})
    await run(test,'admin','real',1000,true,{withReceipt:true,failReceipt:true,expectedStatus:500})
    await run(test,'admin','real',1000,true,{withReceipt:true})
    await run([test[0]+'-self',test[1],{...test[2],recipientId:'sender'},0],'admin','real')
  }
  await run(cases[0],'admin','real',1000,true,{withReceipt:true,failNotification:true})
  console.log(`PASS ${count} isolated gift scenarios (roles, guest split, self-gift, validation, rollback, receipt). No real database concurrency or device test.`)
})().catch(e=>{console.error(e);process.exitCode=1})
