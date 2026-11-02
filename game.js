// Rules for the traditional 90-ball game. No network services required.
export const TOTAL = 90;
export function randomInt(max, random = Math.random) { return Math.floor(random() * max); }
export function shuffled(values, random = Math.random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1, random);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function nextBall(called, random = Math.random, total = TOTAL) {
  const available = Array.from({ length: total }, (_, i) => i + 1).filter(n => !called.includes(n));
  return available.length ? available[randomInt(available.length, random)] : null;
}
export function seededRandom(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6D2B79F5;
    let t = Math.imul(h ^ h >>> 15, 1 | h);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function makeCard(id, mode = 90) {
  if (mode === 75) {
    const random = seededRandom('75:' + id);
    const columns = Array.from({length:5},(_,c)=>shuffled(Array.from({length:15},(_,i)=>c*15+i+1),random).slice(0,5));
    return Array.from({length:5},(_,r)=>Array.from({length:5},(_,c)=>r===2&&c===2?null:columns[c][r]));
  }
  const random = seededRandom(id);
  let occupied;
  // Each row has five cells; every column must contain at least one number.
  do {
    occupied = Array.from({ length: 3 }, () => new Set(shuffled([0,1,2,3,4,5,6,7,8], random).slice(0,5)));
  } while (Array.from({ length: 9 }, (_, c) => occupied.every(row => !row.has(c))).some(Boolean));
  const card = Array.from({ length: 3 }, () => Array(9).fill(null));
  for (let c = 0; c < 9; c++) {
    const rows = [0,1,2].filter(r => occupied[r].has(c));
    const start = c === 0 ? 1 : c * 10;
    const end = c === 8 ? 90 : c * 10 + 9;
    const numbers = shuffled(Array.from({ length: end - start + 1 }, (_, i) => start + i), random).slice(0, rows.length).sort((a,b) => a-b);
    rows.forEach((r, i) => card[r][c] = numbers[i]);
  }
  return card;
}
export function cardProgress(card, marked) {
  const numbers = card.flat().filter(n => n !== null);
  const complete = cells => cells.every(n=>n===null||marked.includes(n));
  const lines = [...card];
  if(card.length===5){
    for(let c=0;c<5;c++)lines.push(card.map(row=>row[c]));
    lines.push(card.map((row,r)=>row[r]),card.map((row,r)=>row[4-r]));
  }
  return {
    count: numbers.filter(n => marked.includes(n)).length,
    line: lines.some(complete),
    bingo: numbers.every(n => marked.includes(n))
  };
}
export function validHostState(value) {
  const total=value?.mode===75?75:90;
  return value && (value.mode===undefined||value.mode===75||value.mode===90) && Array.isArray(value.called) && value.called.length <= total &&
    value.called.every(n => Number.isInteger(n) && n >= 1 && n <= total) &&
    new Set(value.called).size === value.called.length && typeof value.ended === 'boolean';
}
