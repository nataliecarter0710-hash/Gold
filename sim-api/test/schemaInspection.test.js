import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
const OriginalClient=pg.Client;
class MockClient {
 static instances=[]; static next={};
 constructor(config){this.config=config;this.calls=[];this.options=MockClient.next;MockClient.next={};MockClient.instances.push(this);}
 async connect(){this.calls.push(['connect']);if(this.options.connectError)throw this.options.connectError;}
 async query(sql,params){this.calls.push(['query',sql,params]);if(sql==='BEGIN READ ONLY'&&this.options.beginError)throw this.options.beginError;
 if(typeof sql==='string'&&sql.includes('transaction_read_only')){if(this.options.verificationError)throw this.options.verificationError;return {rows:[this.options.verificationRow??validRow]};}
 if(typeof sql==='string'&&sql.includes('information_schema.columns'))return {rows:this.options.metadataRows??[{table_name:'game_sessions',column_name:'tenant_id'}]};
 return {rows:[]};}
 async end(){this.calls.push(['end']);}
}
test.before(()=>{pg.Client=MockClient;});
test.after(()=>{pg.Client=OriginalClient;delete process.env.DIAGNOSTIC_DB_ENABLED;delete process.env.DIAGNOSTIC_READONLY_DATABASE_URL;});
test.beforeEach(()=>{MockClient.instances=[];MockClient.next={};});
const moduleUrl='../src/db/schemaInspection.js';
const validUrl='postgresql://diagnostic_reader:unused@localhost:5432/testdb';
const validRow={role_name:'diagnostic_reader',transaction_read_only:'on',rolcanlogin:true,rolsuper:false,rolcreaterole:false,rolcreatedb:false,rolbypassrls:false,rolinherit:false,no_memberships:true,db_create:false,db_temp:false,schema_create:false,table_write:false,target_select:true,other_table_access:false,function_execute:false};
async function load(){return import(`${moduleUrl}?test=${Date.now()}-${Math.random()}`);}
function enable(){process.env.DIAGNOSTIC_DB_ENABLED='true';process.env.DIAGNOSTIC_READONLY_DATABASE_URL=validUrl;}
function metadata(c){return c.calls.some(([k,s])=>k==='query'&&typeof s==='string'&&s.includes('information_schema.columns'));}
function failed(c){assert.ok(c.calls.some(([k,s])=>k==='query'&&s==='ROLLBACK'));assert.ok(c.calls.some(([k])=>k==='end'));assert.equal(metadata(c),false);}
test('disabled by default and dedicated URL required',async()=>{const {inspectTableColumns}=await load();delete process.env.DIAGNOSTIC_DB_ENABLED;process.env.DIAGNOSTIC_READONLY_DATABASE_URL=validUrl;await assert.rejects(inspectTableColumns(),/disabled/);assert.equal(MockClient.instances.length,0);process.env.DIAGNOSTIC_DB_ENABLED='true';delete process.env.DIAGNOSTIC_READONLY_DATABASE_URL;await assert.rejects(inspectTableColumns(),/dedicated/);});
test('rejects unapproved table and schema before connection',async()=>{enable();const {inspectTableColumns}=await load();await assert.rejects(inspectTableColumns(['widgets']),/approved/);await assert.rejects(inspectTableColumns(undefined,{schema:'other'}),/approved/);assert.equal(MockClient.instances.length,0);});
test('malformed URL fails before connection',async()=>{enable();process.env.DIAGNOSTIC_READONLY_DATABASE_URL='bad';const {inspectTableColumns}=await load();await assert.rejects(inspectTableColumns(),/configuration is invalid/);assert.equal(MockClient.instances.length,0);});
test('strict TLS certificate verification cannot be overridden',async()=>{enable();process.env.PGSSL_REJECT_UNAUTHORIZED='false';const {inspectTableColumns}=await load();MockClient.next={verificationRow:validRow};await inspectTableColumns(['game_sessions']);assert.equal(MockClient.instances[0].config.ssl.rejectUnauthorized,true);delete process.env.PGSSL_REJECT_UNAUTHORIZED;});
test('connection failure fails closed',async()=>{enable();MockClient.next={connectError:new Error('connect failed')};const {inspectTableColumns}=await load();await assert.rejects(inspectTableColumns(['game_sessions']),/connect failed/);failed(MockClient.instances[0]);});
test('BEGIN READ ONLY failure fails closed',async()=>{enable();MockClient.next={beginError:new Error('begin failed')};const {inspectTableColumns}=await load();await assert.rejects(inspectTableColumns(['game_sessions']),/begin failed/);failed(MockClient.instances[0]);});
test('verification query failure fails closed',async()=>{enable();MockClient.next={verificationError:new Error('verify failed')};const {inspectTableColumns}=await load();await assert.rejects(inspectTableColumns(['game_sessions']),/verify failed/);failed(MockClient.instances[0]);});
test('every safety condition must pass before metadata query',async(t)=>{const bad=[['role mismatch',{...validRow,role_name:'other'}],['transaction',{...validRow,transaction_read_only:'off'}],['login disabled',{...validRow,rolcanlogin:false}],['superuser',{...validRow,rolsuper:true}],['role creation',{...validRow,rolcreaterole:true}],['database creation',{...validRow,rolcreatedb:true}],['RLS bypass',{...validRow,rolbypassrls:true}],['inheritance',{...validRow,rolinherit:true}],['membership',{...validRow,no_memberships:false}],['database create',{...validRow,db_create:true}],['temporary',{...validRow,db_temp:true}],['schema create',{...validRow,schema_create:true}],['table write',{...validRow,table_write:true}],['target select missing',{...validRow,target_select:false}],['other table access',{...validRow,other_table_access:true}],['function execute',{...validRow,function_execute:true}]];for(const [name,row] of bad)await t.test(name,async()=>{enable();MockClient.next={verificationRow:row};const {inspectTableColumns}=await load();await assert.rejects(inspectTableColumns(['game_sessions']),/failed read-only verification/);failed(MockClient.instances[0]);});});
test('metadata query occurs only after verification',async()=>{enable();MockClient.next={metadataRows:[{table_name:'game_sessions',column_name:'tenant_id'}]};const {inspectTableColumns}=await load();const rows=await inspectTableColumns(['game_sessions']);const c=MockClient.instances[0];assert.equal(metadata(c),true);assert.deepEqual(rows,[{table_name:'game_sessions',column_name:'tenant_id'}]);assert.ok(c.calls.some(([,s])=>s==='COMMIT'));assert.ok(c.calls.some(([k])=>k==='end'));});
