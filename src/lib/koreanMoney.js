// 만원 단위 정수 → "이백만원(2,000,000원)" 형식
const DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const SMALL_UNITS = ['', '십', '백', '천'];
const BIG_UNITS = ['', '만', '억', '조'];

// 0~9999 → 한글. 십·백·천 앞의 "일"은 생략한다(일백 → 백, 일십 → 십, 일천 → 천).
function groupToKorean(n) {
  const s = String(n).padStart(4, '0');
  let out = '';
  for (let i = 0; i < 4; i++) {
    const d = Number(s[i]);
    if (!d) continue;
    const pos = 3 - i;
    out += (d === 1 && pos > 0 ? '' : DIGITS[d]) + SMALL_UNITS[pos];
  }
  return out;
}

/** 원 단위 정수 → 한글 (예: 2000000 → "이백만") */
export function wonToKorean(won) {
  won = Math.floor(Math.abs(Number(won) || 0));
  if (won === 0) return '영';
  let out = '';
  let unit = 0;
  while (won > 0) {
    const g = won % 10000;
    if (g) {
      let gs = groupToKorean(g);
      // 10,000 → "만"(일만 X). 단, 억 이상이 붙으면 "이억일만"처럼 남긴다.
      if (unit === 1 && g === 1 && won < 10000) gs = '';
      out = gs + BIG_UNITS[unit] + out;
    }
    won = Math.floor(won / 10000);
    unit++;
  }
  return out;
}

/** 입력 문자열/숫자 → 만원 단위 정수 또는 null */
export function parseMan(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/[,\s]/g, '');
  if (s === '') return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

/** 만원 단위 → "이백만원(2,000,000원)" */
export function formatMan(man) {
  const n = parseMan(man);
  if (n === null) return '';
  const won = n * 10000;
  return `${wonToKorean(won)}원(${won.toLocaleString('en-US')}원)`;
}
