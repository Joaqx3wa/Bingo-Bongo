import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

test('installed assets support offline navigation and preserve other apps caches',async()=>{
  const scope='https://joaqx3wa.github.io/Bingo-Bongo/';
  const listeners={},stores=new Map([['another-app',new Map()],['bingo-bongo-old',new Map()]]);
  const key=request=>new URL(typeof request==='string'?request:request.url,scope).href;
  const cacheAPI={
    async open(name){if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name);return {
      async addAll(files){for(const file of files){const path=file==='./'?'index.html':file;store.set(key(file),new Response(await readFile(new URL('../'+path,import.meta.url))));}},
      async put(request,response){store.set(key(request),response);}
    };},
    async keys(){return [...stores.keys()];},
    async delete(name){return stores.delete(name);},
    async match(request){for(const store of stores.values()){const response=store.get(key(request));if(response)return response.clone();}}
  };
  let online=false;
  const context=vm.createContext({URL,Response,caches:cacheAPI,fetch:async()=>{if(!online)throw Error('Offline');return new Response('updated online app');},self:{registration:{scope},clients:{claim:async()=>{}},addEventListener:(name,callback)=>listeners[name]=callback}});
  vm.runInContext(await readFile(new URL('../sw.js',import.meta.url),'utf8'),context);
  let operation;
  listeners.install({waitUntil:promise=>operation=promise});await operation;
  listeners.activate({waitUntil:promise=>operation=promise});await operation;
  assert.ok(stores.has('another-app'));assert.ok(!stores.has('bingo-bongo-old'));
  async function fetchApp(path,mode='cors'){let result;listeners.fetch({request:{url:new URL(path,scope).href,method:'GET',mode},respondWith:promise=>result=promise});return result;}
  assert.match(await (await fetchApp('./app.js')).text(),/DrumRenderer/);
  assert.match(await (await fetchApp('./missing-route','navigate')).text(),/Sacar cartilla/);
  online=true;assert.equal(await (await fetchApp('./app.js')).text(),'updated online app');
  online=false;assert.equal(await (await fetchApp('./app.js')).text(),'updated online app');
  assert.equal(await fetchApp('https://joaqx3wa.github.io/another-app/'),undefined);
});
