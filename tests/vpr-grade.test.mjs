import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gradeVpr} from '../vpr-grade.js';
const keys=JSON.parse(fs.readFileSync(new URL('../vpr-keys.json',import.meta.url)));
test('176 keys cover the source task counts and canonical automatic answers pass',()=>{
 assert.deepEqual(Object.values(keys).map(v=>v.length),[16,16,16,16,16,16,16,15,16,16,17]);
 for(const variant of Object.values(keys))for(const key of variant){
  if(key.manual)assert.equal(gradeVpr('ответ и рисунок',key),null);
  else if(key.parts)assert.equal(gradeVpr('1154;18',key),true);
  else for(const answer of key.answers)assert.equal(gradeVpr(answer,key),true,JSON.stringify(key));
 }
});

test('the original missing-square typo is not propagated from the answer PDF',()=>{
 // Variant1 has (4-y)^2-y(y+1), while variant9 visibly has (4-y)-y(y+1).
 assert.equal(gradeVpr('17',keys['1'][10]),true);
 assert.equal(gradeVpr('341/81',keys['9'][10]),true);
 assert.equal(gradeVpr('4 17/81',keys['9'][10]),true);
 assert.equal(gradeVpr('17',keys['9'][10]),false);
 assert.equal(gradeVpr('не хватит',keys['1'][9]),false);
 assert.equal(gradeVpr('нет',keys['9'][9]),true);
});
test('numbers support fractions, decimal commas, units and explicit official intervals',()=>{
 assert.equal(gradeVpr('-14/24',{answers:['-7/12']}),true);
 assert.equal(gradeVpr('7 1/2',keys['10'][7]),true);
 assert.equal(gradeVpr('12 г',keys['1'][6]),true);
 assert.equal(gradeVpr('18,01',keys['1'][6]),false);
 assert.equal(gradeVpr('',keys['11'][0]),false);
 assert.equal(gradeVpr('1/0',keys['11'][0]),false);
});
test('choice lists and two-part answers are checked without treating them as numbers',()=>{
 for(const s of ['23','32','2, 3','3 и 2','2;3'])assert.equal(gradeVpr(s,keys['11'][15]),true,s);
 assert.equal(gradeVpr('223',keys['11'][15]),false);
 assert.equal(gradeplib('1154;18'),true);
 assert.equal(gradeVpr('1154;19',keys['11'][14]),false);
 function gradeplib(s){return gradeVpr(s,keys['11'][14]);}
});
test('linear formulas accept common equivalent order and reject invalid exponent operators',()=>{
 for(const s of ['y=2*x-1','у=2х-1','f(x)=-1+2x','x*2-1','2x-1'])assert.equal(gradeVpr(s,keys['1'][7]),true,s);
 for(const s of ['2**x-1','2x+1','x*x-1','2x--1',''])assert.equal(gradeVpr(s,keys['1'][7]),false,s);
});
