import test from 'node:test';
import assert from 'node:assert/strict';
import {DrumModel} from '../drum.js';
import {squareLayout,TICKET_COLORS} from '../ticket-layout.js';
import {rollingNoise} from '../spin-audio.js';

test('the 3D drum tumbles in all three axes and conserves every undrawn sphere',()=>{
  for(const total of [75,90]){
    const drum=new DrumModel([1,7],total),initial=drum.balls.map(b=>({...b}));
    for(let i=0;i<400;i++)drum.step(1/60,6);
    assert.equal(drum.balls.length,total-2);assert.ok(drum.angle>35);
    assert.ok(drum.balls.some((b,i)=>Math.abs(b.z-initial[i].z)>40));
    assert.ok(new Set(drum.balls.map(b=>Math.round(b.z/10))).size>10);
    for(const b of drum.balls){assert.ok(Number.isFinite(b.x)&&Number.isFinite(b.y)&&Number.isFinite(b.z));assert.ok(Math.hypot(b.x,b.y,b.z)<=156.001);}
  }
});
test('both ticket formats preserve square cells inside desktop, portrait and landscape space',()=>{
  for(const [w,h]of [[320,180],[330,440],[350,610],[800,260],[1200,600],[260,150]])for(const mode of [75,90]){
    const columns=mode===75?5:9,rows=mode===75?5:3,gap=4,header=mode===75?32:0;
    const layout=squareLayout(w,h,columns,rows,gap,header);
    assert.ok(layout.size>0);assert.ok(layout.width<=w);assert.ok(layout.height+header<=h);
    assert.equal((layout.width-(columns-1)*gap)/columns,(layout.height-(rows-1)*gap)/rows);
  }
  assert.equal(Object.keys(TICKET_COLORS).length,6);
});
test('mechanical rolling audio contains a substantial non-silent, bounded waveform',()=>{
  const samples=rollingNoise(48000),rms=Math.sqrt(samples.reduce((sum,n)=>sum+n*n,0)/samples.length),mean=samples.reduce((sum,n)=>sum+n,0)/samples.length;
  assert.equal(samples.length,96000);assert.ok(rms>.2&&rms<.7);assert.ok(Math.abs(mean)<.02);
  assert.ok(samples.every(n=>Number.isFinite(n)&&Math.abs(n)<=1));
  assert.ok(samples.some(n=>n>.5)&&samples.some(n=>n<-.5));
});
