import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAnswer,isCorrect} from '../checker.js';
test('принимает школьные способы записи чисел',()=>{
 for (const [input,expected] of [['2',2],[' −3/4 ',-.75],['0,75',.75],['.5',.5],['2 / 4',.5],['1 1/2',1.5],['-1 1/2',-1.5],['6/−8',-.75]]) assert.equal(parseAnswer(input),expected,input);
});
test('не считает пустой или неверный ввод нулём',()=>{
 for(const input of ['', ' ', '1/0','0/0','Infinity','NaN','1+2','2/3/4','abc','<script>','1 2','1,2.3','1e1000']) assert.equal(parseAnswer(input),null,input);
});
test('сверяет эквивалентные дроби и десятичные числа',()=>{
 assert.equal(isCorrect('2/6',[1,3]),true);
 assert.equal(isCorrect('0,3',[3,10]),true);
 assert.equal(isCorrect('-14/24',[-7,12]),true);
 assert.equal(isCorrect('0.33',[1,3]),false);
 assert.equal(isCorrect('5',[6,1]),false);
 assert.equal(isCorrect('',[0,1]),false);
});
