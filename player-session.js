import { makeCard } from './game.js';
export function createSession(ids,mode){
  if(![75,90].includes(mode)||ids.length<1||ids.length>6||new Set(ids).size!==ids.length||ids.some(id=>!/^[A-F0-9]{10}$/.test(id)))throw Error('Selección inválida');
  return {ids:[...ids],mode,marks:[],locked:true,index:0,startedAt:Date.now()};
}
export function validSession(value){
  try{if(!value||typeof value.locked!=='boolean'||!Array.isArray(value.ids)||!Array.isArray(value.marks))return false;createSession(value.ids,value.mode);return value.marks.every(n=>Number.isInteger(n)&&n>=1&&n<=value.mode)&&new Set(value.marks).size===value.marks.length;}catch{return false;}
}
export function toggleSessionNumber(session,n){
  if(!session.locked||!Number.isInteger(n)||!session.ids.some(id=>makeCard(id,session.mode).flat().includes(n)))return session;
  return {...session,marks:session.marks.includes(n)?session.marks.filter(v=>v!==n):[...session.marks,n]};
}
export function cardMarks(session,id){return session.marks.filter(n=>makeCard(id,session.mode).flat().includes(n));}
