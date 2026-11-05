import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMan, wonToKorean } from '../src/lib/koreanMoney.js';

test('지시서 예시', () => {
  assert.equal(formatMan(200), '이백만원(2,000,000원)');
  assert.equal(formatMan(150), '백오십만원(1,500,000원)');
  assert.equal(formatMan(100), '백만원(1,000,000원)');
  assert.equal(formatMan(50), '오십만원(500,000원)');
});

test('십·백·천·만·억 처리', () => {
  assert.equal(formatMan(10), '십만원(100,000원)');
  assert.equal(formatMan(1), '만원(10,000원)');
  assert.equal(formatMan(330), '삼백삼십만원(3,300,000원)');
  assert.equal(formatMan(1000), '천만원(10,000,000원)');
  assert.equal(formatMan(1250), '천이백오십만원(12,500,000원)');
  assert.equal(formatMan(10000), '일억원(100,000,000원)');
  assert.equal(formatMan(12500), '일억이천오백만원(125,000,000원)');
  assert.equal(formatMan(20001), '이억일만원(200,010,000원)');
  assert.equal(wonToKorean(0), '영');
  assert.equal(formatMan(''), '');
});
