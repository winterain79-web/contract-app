import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractClientInfo } from '../src/lib/extractClient.js';

test('이름표가 있는 대화', () => {
  const r = extractClientInfo(`오후 3:21
안녕하세요 계약서 작성에 필요한 정보 보내드립니다
성명 : 홍길동
주민번호 : 800101-1234567
주소 : 서울특별시 중랑구 망우로81길 27 염광아파트
2동 207호
연락처 010-1234-5678
배우자 국적은 미얀마입니다
오후 3:25 감사합니다 행정사 연락처 010-8534-3213`);
  assert.deepEqual(r, {
    clientName: '홍길동',
    rrn: '800101-1234567',
    address: '서울특별시 중랑구 망우로81길 27 염광아파트 2동 207호',
    phone: '010-1234-5678',
    nationality: '미얀마',
  });
});

test('이름표 없이 줄줄이 보낸 경우 + OCR 기호 오류', () => {
  const r = extractClientInfo(`김철수
８５０２０２－１２３４５６７
경기도 수원시 팔달구 효원로 1 101동 1001호
01098765432
베트남 신부랑 결혼했어요`);
  assert.equal(r.clientName, '김철수');
  assert.equal(r.rrn, '850202-1234567');
  assert.equal(r.address, '경기도 수원시 팔달구 효원로 1 101동 1001호');
  assert.equal(r.phone, '010-9876-5432');
  assert.equal(r.nationality, '베트남');
});

test('법인 정보는 고객 정보로 잡지 않음, 없는 값은 빈칸', () => {
  const r = extractClientInfo(`더바른행정사법인입니다
본점 주소 : 경상남도 김해시 가락로 61-1
연락처 : 1660-3213 / 010-8534-3213`);
  assert.deepEqual(r, { clientName: '', rrn: '', address: '', phone: '', nationality: '' });
});

test('이름 문장형', () => {
  const r = extractClientInfo('제 이름은 이영희입니다. 주민번호는 9012312345678 이에요');
  assert.equal(r.clientName, '이영희');
  assert.equal(r.rrn, '901231-2345678');
});

test('행정사가 보낸 요청 문장은 값으로 잡지 않음', () => {
  const r = extractClientInfo(`성명, 주민등록번호, 주소, 연락처, 배우자 국적 보내주세요
네
성명 : 박민수
주소 : 부산광역시 해운대구 센텀중앙로 97 센텀아파트 103동 1502호`);
  assert.equal(r.clientName, '박민수');
  assert.equal(r.address, '부산광역시 해운대구 센텀중앙로 97 센텀아파트 103동 1502호');
});

test('OCR 오인식: 섬명', () => {
  assert.equal(extractClientInfo('섬명 : 박민수\n\n주민번호 : 820315-1234567').clientName, '박민수');
  assert.equal(extractClientInfo('삼명 : 박민수\n주민번호 : 820315-1234567').clientName, '박민수');
});
