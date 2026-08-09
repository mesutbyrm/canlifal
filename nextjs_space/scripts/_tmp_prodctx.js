const fs=require('fs'),path=require('path');
const env=fs.readFileSync(path.join(__dirname,'..','.env'),'utf8');
for(const l of env.split('\n')){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);if(m){let v=m[2].trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);if(!process.env[m[1]])process.env[m[1]]=v;}}
const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();
(async()=>{
 const users=await p.user.findMany({where:{OR:[{email:{contains:'mesutbyrm1+'}},{email:{contains:'test'}}]},select:{id:true,email:true,role:true,jetonBalance:true},take:15});
 const streams=await p.videoStream.findMany({where:{status:'live'},orderBy:{createdAt:'desc'},take:3,select:{id:true,status:true,createdAt:true}});
 const types=await p.fortuneRequestType.findMany({where:{isActive:true},select:{id:true,jetonCost:true}});
 console.log(JSON.stringify({users,streams,types},null,1));
 await p.$disconnect();
})().catch(e=>{console.error(e.message);process.exit(1)});
