import test from 'node:test';
import assert from 'node:assert/strict';
import { DrumModel, colorFor } from '../drum.js';
import { readFile } from 'node:fs/promises';

test('one particle per ball, one extraction at a time, with no called balls in a restored drum',()=>{
  const drum=new DrumModel();
  assert.equal(drum.balls.length,90);assert.equal(new Set(drum.balls.map(b=>b.n)).size,90);
  for(let n=1;n<=90;n++){assert.equal(drum.remove(n).n,n);assert.equal(drum.balls.length,90-n);assert.equal(drum.remove(n),null);}
  const restored=new DrumModel([1,7,24,90]);assert.equal(restored.balls.length,86);assert.ok(restored.balls.every(b=>![1,7,24,90].includes(b.n)));
  restored.reset();assert.equal(restored.balls.length,90);
});
test('tumbling conserves all particles and keeps them within the cage',()=>{
  const drum=new DrumModel();
  for(let i=0;i<600;i++)drum.step(1/60,true);
  assert.equal(drum.balls.length,90);
  for(const ball of drum.balls){assert.ok(Number.isFinite(ball.x)&&Number.isFinite(ball.y));assert.ok(Math.hypot(ball.x,ball.y)<=161.001);}
  assert.equal(colorFor(1),'red');assert.equal(colorFor(90),'purple');
});
test('install manifest is scoped to this GitHub Pages app and has valid PNG icons',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
  assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./');assert.equal(manifest.display,'standalone');
  assert.ok(manifest.icons.some(i=>i.sizes==='192x192'));assert.ok(manifest.icons.some(i=>i.sizes==='512x512'&&i.purpose==='maskable'));
  for(const icon of manifest.icons){const png=await readFile(new URL('../'+icon.src,import.meta.url));assert.equal(png.readUInt32BE(0),0x89504e47);const [width,height]=icon.sizes.split('x').map(Number);assert.equal(png.readUInt32BE(16),width);assert.equal(png.readUInt32BE(20),height);}
});
