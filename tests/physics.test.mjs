import test from 'node:test';
import assert from 'node:assert/strict';
import {DrumModel} from '../drum.js';

function ball(overrides={}){return {n:1,x:0,y:50,z:0,vx:0,vy:0,vz:0,rotation:0,...overrides};}
test('free balls fall vertically even while the cage rotates in either direction',()=>{
  for(const omega of [-8,8]){
    const model=new DrumModel();model.balls=[ball()];model.step(.05,omega);
    const b=model.balls[0];assert.ok(b.y<50);assert.ok(b.vy<0);assert.equal(b.z,0);assert.equal(b.x,0);
    assert.equal(Math.sign(model.angle),Math.sign(omega));
  }
});
test('a dropped ball bounces and settles on the stationary bottom paddle',()=>{
  const model=new DrumModel();model.balls=[ball({y:95})];let bounced=false;
  for(let i=0;i<480;i++){model.step(1/120,0);if(model.balls[0].vy>15)bounced=true;}
  assert.ok(bounced);assert.ok(Math.abs(model.balls[0].y+130)<.5);assert.ok(Math.abs(model.balls[0].vy)<10);
});
test('equal spheres exchange momentum and separate on impact',()=>{
  const model=new DrumModel();model.balls=[ball({x:-15,vx:40}),ball({n:2,x:15,vx:-40})];model.step(1/120,0);
  const [a,b]=model.balls;assert.ok(a.vx<0&&b.vx>0);assert.ok(Math.abs(a.vx+b.vx)<.001);assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)>=31.9);
});
test('substeps contain fast spheres inside the cage',()=>{
  const model=new DrumModel();model.balls=[ball({x:125,y:0,vx:700})];
  for(let i=0;i<100;i++){model.step(1/30,-9);assert.ok(Math.hypot(model.balls[0].x,model.balls[0].y,model.balls[0].z)<=156.001);}
});
