import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCard,nextBall,cardProgress,validHostState} from '../game.js';
import {createSession,validSession,toggleSessionNumber,cardMarks} from '../player-session.js';
import {SpinMotor,DrumModel} from '../drum.js';

test('75-ball cards have the BINGO column ranges, a free center and 24 unique numbers',()=>{
  for(let i=0;i<3000;i++){
    const card=makeCard(String(i),75);assert.equal(card.length,5);assert.equal(card[2][2],null);
    const values=card.flat().filter(n=>n!==null);assert.equal(values.length,24);assert.equal(new Set(values).size,24);
    for(let r=0;r<5;r++)for(let c=0;c<5;c++)if(card[r][c]!==null)assert.ok(card[r][c]>=c*15+1&&card[r][c]<=(c+1)*15);
    assert.deepEqual(card,makeCard(String(i),75));
  }
});
test('75-ball draws, restored drum and saved state respect the selected total',()=>{
  const called=[];for(let i=0;i<75;i++)called.push(nextBall(called,Math.random,75));
  assert.equal(new Set(called).size,75);assert.equal(nextBall(called,Math.random,75),null);assert.ok(!called.includes(76));
  assert.ok(validHostState({mode:75,called,ended:false}));assert.ok(!validHostState({mode:75,called:[90],ended:false}));
  assert.equal(new DrumModel([1,75],75).balls.length,73);
});
test('a confirmed group is a snapshot, persists correctly and shares marks by number',()=>{
  const ids=['A000000001','B000000002'],session=createSession(ids,90);ids.push('C000000003');assert.equal(session.ids.length,2);
  const first=makeCard(session.ids[0]).flat().filter(n=>n!==null),second=makeCard(session.ids[1]).flat();
  const common=first.find(n=>second.includes(n));assert.ok(common);
  const marked=toggleSessionNumber(session,common);assert.ok(cardMarks(marked,session.ids[0]).includes(common));assert.ok(cardMarks(marked,session.ids[1]).includes(common));
  assert.deepEqual(marked.ids,session.ids);assert.ok(marked.locked);assert.ok(validSession(JSON.parse(JSON.stringify(marked))));
  assert.ok(!toggleSessionNumber(marked,common).marks.includes(common));
  assert.deepEqual(toggleSessionNumber({...marked,locked:false},common).marks,marked.marks);
  assert.throws(()=>createSession(['A000000001','A000000001'],90));assert.throws(()=>createSession(Array.from({length:7},(_,i)=>String(i).padStart(10,'0')),90));assert.ok(!validSession({...session,marks:[91]}));
});
test('BINGO lines include columns and diagonals through the free center',()=>{
  const card=makeCard('ABC123ABCD',75);
  assert.ok(cardProgress(card,card.map(row=>row[0])).line);
  assert.ok(cardProgress(card,card.map((row,r)=>row[r]).filter(n=>n!==null)).line);
  assert.equal(cardProgress(card,card.flat().filter(n=>n!==null)).count,24);
  assert.ok(cardProgress(card,card.flat()).bingo);
});
test('each press adds turns, subsequent presses prolong the spin, friction stops it',()=>{
  function run(kicks){const motor=new SpinMotor();for(let i=0;i<kicks;i++)motor.kick();let time=0,angle=0;while(motor.running&&time<30){angle+=motor.step(1/60);time+=1/60;}assert.ok(!motor.running);assert.equal(motor.speed,0);return{time,angle};}
  const single=run(1),triple=run(3);assert.ok(triple.time>single.time);assert.ok(triple.angle>single.angle*2.9);assert.ok(single.time<6);assert.ok(triple.time<10);
});
