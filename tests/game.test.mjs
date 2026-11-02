import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard, cardProgress, nextBall, validHostState } from '../game.js';

test('10,000 traditional 90-ball cards obey every row and column rule', () => {
  for (let i = 0; i < 10000; i++) {
    const card = makeCard(String(i));
    assert.equal(card.length,3);
    for (const row of card) { assert.equal(row.length,9); assert.equal(row.filter(n=>n !== null).length,5); }
    const numbers = card.flat().filter(n=>n!==null);
    assert.equal(numbers.length,15); assert.equal(new Set(numbers).size,15);
    for (let c=0;c<9;c++) {
      const column = card.map(row=>row[c]).filter(n=>n!==null);
      assert.ok(column.length >= 1 && column.length <= 3);
      assert.deepEqual(column,[...column].sort((a,b)=>a-b));
      for (const n of column) assert.ok(n >= (c === 0 ? 1 : c*10) && n <= (c === 8 ? 90 : c*10+9));
    }
    assert.deepEqual(makeCard(String(i)),card);
  }
});
test('90 draws exhaust the drum without repetitions, including both endpoints', () => {
  const called = [];
  for (let i = 0; i < 90; i++) called.push(nextBall(called));
  assert.equal(new Set(called).size,90);
  assert.deepEqual([...called].sort((a,b)=>a-b),Array.from({length:90},(_,i)=>i+1));
  assert.equal(nextBall(called),null);
  assert.equal(nextBall([],()=>0),1);
  assert.equal(nextBall([],()=>.999999),90);
});
test('line and full bingo require the correct numbers', () => {
  const card = makeCard('AB1234AB12');
  const row = card[0].filter(n=>n!==null);
  assert.deepEqual(cardProgress(card,[]),{count:0,line:false,bingo:false});
  assert.deepEqual(cardProgress(card,row),{count:5,line:true,bingo:false});
  assert.deepEqual(cardProgress(card,card.flat()),{count:15,line:true,bingo:true});
  assert.equal(cardProgress(card,row.slice(0,4)).line,false);
});
test('invalid saved games cannot corrupt a draw', () => {
  assert.equal(validHostState({called:[1,90],ended:false}),true);
  for (const value of [null,{}, {called:[1,1],ended:false},{called:[0],ended:false},{called:[91],ended:false},{called:['2'],ended:false},{called:[1],ended:1}]) assert.ok(!validHostState(value));
});
