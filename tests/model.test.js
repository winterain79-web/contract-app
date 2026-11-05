import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dutyItems, emptyData, normalize } from '../src/templates/f6/model.js';
import { TIMING_OPTIONS, optionText } from '../src/templates/f6/constants.js';

test('빈 항목은 빠지고 부가 문구가 붙는다', () => {
  const d = emptyData();
  d.slots[0] = { opt: 'v03', text: optionText('v03', '미얀마'), edited: false, extra: '' };
  d.slots[2] = { opt: 'custom', text: '직접 쓴 항목', edited: true, extra: '(※ 별도 50만원 진행)' };
  assert.deepEqual(dutyItems(d), [
    '한국 혼인신고를 위한 미얀마 서류 안내 및 한국 혼인신고 접수 대행',
    '직접 쓴 항목 (※ 별도 50만원 진행)',
  ]);
});

test('이전 버전 데이터 변환 (줄 텍스트, 자진출국 유형)', () => {
  const d = normalize({ applyType: 'exit', presetId: 'J', duties: '(1) 가\n나\n\n다', dutiesEdited: false });
  assert.equal(d.applyType, 'change');
  assert.deepEqual(dutyItems(d), ['가', '나', '다']);
  assert.equal(d.slots.length, 5);
  assert.equal('duties' in d, false);
});

test('기본값: 금액 비어 있음, 항목 비어 있음, 시점 문구', () => {
  const d = emptyData();
  assert.equal(d.total, '');
  assert.equal(dutyItems(d).length, 0);
  assert.ok(TIMING_OPTIONS.includes('체류자격 변경 신청 서류 발송 시'));
  assert.ok(!TIMING_OPTIONS.includes('체류자격 변경 신청 시'));
});
