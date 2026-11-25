import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require=createRequire(import.meta.url)
const ts=require('typescript')
function load(file,deps={}) {
  const exports={}
  const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  vm.runInNewContext(code,{exports,Response,require:id=>{if(!(id in deps))throw new Error(`Unexpected dependency ${id}`);return deps[id]}})
  return exports
}
const domain=load('lib/adminAccess.ts')
let loggedIn=true,board=false,rpcError=null,calls=[]
const client={
  auth:{getUser:async()=>({data:{user:loggedIn?{id:'session-user'}:null},error:null})},
  rpc:async(name,args)=>{calls.push({name,args});return name==='can_manage_admin_access'?{data:board,error:rpcError}:{data:{changed:true},error:null}},
}
const guard=load('lib/server/adminAccess.ts',{'server-only':{},'@/lib/supabase/server':{createSupabaseServerClient:async()=>client}})
const route=load('app/api/admin-access/route.ts',{'next/server':{NextResponse:{json:Response.json}},'@/lib/adminAccess':domain,'@/lib/server/adminAccess':guard})
const req=body=>new Request('http://localhost/api/admin-access',{method:'PATCH',body:JSON.stringify(body)})
test('central endpoint rejects unauthenticated and non-board users before any mutation',async()=>{
  loggedIn=false;assert.equal((await route.PATCH(req({memberId:1,scope:'nfts',enabled:true}))).status,401)
  loggedIn=true;board=false;assert.equal((await route.PATCH(req({memberId:1,scope:'nfts',enabled:true}))).status,403)
  assert.equal((await route.GET()).status,403)
  assert.equal(calls.some(c=>c.name==='set_admin_access'),false)
})
test('board verification fails closed on database errors',async()=>{
  board=true;rpcError={message:'unavailable'}
  try{assert.equal((await route.GET()).status,503)}finally{rpcError=null}
})
test('only supported scopes, real booleans and numeric member ids reach the mutation',async()=>{
  board=true
  for(const body of [null,{}, {memberId:'2',scope:'nfts',enabled:true},{memberId:2,scope:'all',enabled:true},{memberId:2,scope:'nfts',enabled:'true'},{memberId:-1,scope:'nfts',enabled:true}])assert.equal((await route.PATCH(req(body))).status,400)
  calls=[]
  assert.equal((await route.PATCH(req({memberId:2,scope:'newsletter',enabled:true,actorId:'forged',role:'Board Member'}))).status,200)
  const call=calls.find(c=>c.name==='set_admin_access')
  assert.equal(JSON.stringify(call.args),JSON.stringify({p_member_id:2,p_scope:'newsletter',p_enabled:true}))
})
test('old feature-specific endpoints cannot assign or expose administrators',async()=>{
  for(const file of ['app/api/coffee-chats/admins/route.ts','app/api/nft-requests/admins/route.ts']){
    const retired=load(file,{'next/server':{NextResponse:{json:Response.json}}})
    for(const method of ['GET','POST','DELETE'])assert.equal((await retired[method]()).status,410)
  }
})
