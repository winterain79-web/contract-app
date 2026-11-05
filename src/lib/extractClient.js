// 고객과 주고받은 대화(캡처 인식 글자 또는 붙여넣은 글자)에서 의뢰인 정보를 찾는다.
// 결과는 반드시 사람이 확인한 뒤 입력한다(인식 오류 가능).

// 법인 자체 정보는 고객 정보로 잡지 않는다
const FIRM_PHONES = ['01085343213', '16603213', '0553123214'];
const FIRM_ADDR = ['가락로61', '세종대로23길', '상무대로911', '동대구로523'];

const PROVINCES = '서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충청|충북|충남|전라|전북|전남|경상|경북|경남|제주';
const ADDR_START = new RegExp(`(${PROVINCES})[가-힣]*\\s*[가-힣]+(시|군|구)(\\s|$)`);

export const COUNTRIES = [
  '베트남', '미얀마', '태국', '몽골', '필리핀', '인도네시아', '캄보디아', '라오스', '우즈베키스탄', '카자흐스탄',
  '키르기스스탄', '투르크메니스탄', '타지키스탄', '러시아', '우크라이나', '중국', '일본', '대만', '네팔', '스리랑카',
  '방글라데시', '파키스탄', '인도', '말레이시아', '싱가포르', '미국', '캐나다', '영국', '프랑스', '독일', '이탈리아',
  '스페인', '호주', '뉴질랜드', '남아공', '남아프리카공화국', '브라질', '페루', '콜롬비아', '멕시코', '모로코', '이집트',
  '튀르키예', '터키', '이란', '동티모르',
];

const STOP_NAMES = new Set([
  '네', '넵', '넹', '예', '오전', '오후', '사진', '확인', '답장', '전송', '주소', '성명', '이름', '성함', '연락처', '국적',
  '전화', '번호', '주민번호', '고객님', '대표님', '행정사', '어제', '오늘', '내일', '감사', '감사해요', '수고', '부탁',
  '알겠어요', '좋아요', '읽음', '배우자', '남편', '아내', '신랑', '신부', '의뢰인', '본인', '입금', '계좌', '사증', '비자',
]);

/** OCR이 흔히 틀리는 글자/기호 정리 */
export function normalizeText(raw) {
  return String(raw || '')
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xff10 + 48)) // 전각 숫자
    .replace(/[‐‑‒–—―ー一－~〜]/g, '-')
    .replace(/[：]/g, ':')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((l) => l.replace(/(오전|오후)\s*\d{1,2}\s*:\s*\d{2}/g, ' ').trim()) // 카톡 시간 표시
    .join('\n');
}

const stripTail = (s) => s.replace(/\s*(입니다|이에요|예요|이요|요|님|이고|이며|입니당|입니다요)[.!~]*$/, '').trim();

function findRrn(text) {
  const re = /(?<!\d)(\d{2})(\d{2})(\d{2})\s?[-.]?\s?([1-8])\s?(\d{6})(?!\d)/g;
  for (const m of text.matchAll(re)) {
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) return { value: `${m[1]}${m[2]}${m[3]}-${m[4]}${m[5]}`, index: m.index, raw: m[0] };
  }
  return null;
}

function findPhone(text) {
  const re = /(?<!\d)(01[016789])\s?[-.)]?\s?(\d{3,4})\s?[-.]?\s?(\d{4})(?!\d)/g;
  for (const m of text.matchAll(re)) {
    const digits = m[1] + m[2] + m[3];
    if (FIRM_PHONES.includes(digits)) continue;
    return `${m[1]}-${m[2]}-${m[3]}`;
  }
  return null;
}

// 주소다운 값인지: 번지(숫자)와 행정구역/도로명 글자가 있고, 다른 항목 이름이 섞이지 않음
const looksAddress = (v) =>
  /\d/.test(v) && /[가-힣]+(시|도|구|군|읍|면|동|로|길)/.test(v) && !/(연락처|성명|주민|국적|이름|전화)/.test(v) && !/^[,.·]/.test(v);
const isFirmAddr = (s) => FIRM_ADDR.some((f) => s.replace(/\s/g, '').includes(f));
const looksContinuation = (l) =>
  l.length <= 30 &&
  !/[:]/.test(l) &&
  !findRrn(l) &&
  !findPhone(l) &&
  (/^\d/.test(l) || /(\d+\s*(동|호|층|번지)|아파트|빌라|맨션|오피스텔|타워|빌딩|주택|하우스)/.test(l));

function findAddress(lines) {
  // 1) "주소: …" 처럼 이름표가 붙은 경우
  for (let i = 0; i < lines.length; i++) {
    const m = /(주\s*소|거주지|사는\s*곳)\s*(?:는|은)?\s*:?\s*(.*)$/.exec(lines[i]);
    if (!m) continue;
    let v = m[2].trim();
    let j = i + 1;
    if (!v && lines[j]) v = lines[j++];
    if (!v || /^[,.·]/.test(v)) continue;
    if (lines[j] && looksContinuation(lines[j])) v += ' ' + lines[j];
    v = stripTail(v);
    if (looksAddress(v) && !isFirmAddr(v)) return v;
  }
  // 2) 시·도로 시작하는 줄
  for (let i = 0; i < lines.length; i++) {
    const m = ADDR_START.exec(lines[i]);
    if (!m) continue;
    let v = lines[i].slice(m.index).trim();
    if (!/\d/.test(v) && !(lines[i + 1] && looksContinuation(lines[i + 1]))) continue; // 번지 없는 줄은 건너뜀
    if (lines[i + 1] && looksContinuation(lines[i + 1])) v += ' ' + lines[i + 1];
    v = stripTail(v);
    if (looksAddress(v) && !isFirmAddr(v)) return v;
  }
  return null;
}

const hangulOnly = (s) => s.replace(/\s/g, '');
const isNameLike = (s) => /^[가-힣]{2,4}$/.test(s) && !STOP_NAMES.has(s) && !COUNTRIES.includes(s);

function findName(lines, rrnLine) {
  for (const l of lines) {
    // OCR이 '성명'을 '섬명'·'성멍' 등으로 잘못 읽는 경우도 받아 준다
    const m = /([성섬셩정]\s*[명멍맹]|이\s*름|[성섬]\s*함|의뢰인)\s*(?:은|는|이)?\s*:?\s*([가-힣](?:\s?[가-힣]){1,6})/.exec(l);
    if (m) {
      const v = stripTail(hangulOnly(m[2]));
      if (isNameLike(v)) return v;
    }
  }
  // 주민번호 바로 앞뒤 줄에 이름만 있는 경우 (예: "홍길동\n800101-1234567")
  if (rrnLine >= 0) {
    for (const k of [rrnLine - 1, rrnLine - 2, rrnLine + 1]) {
      const l = lines[k];
      if (!l) continue;
      const v = stripTail(hangulOnly(l));
      if (isNameLike(v)) return v;
      // "무엇 : 홍길동" 꼴 (이름표를 잘못 읽은 경우)
      const kv = /^[가-힣\s]{1,6}:\s*([가-힣](?:\s?[가-힣]){1,4})$/.exec(l);
      if (kv) {
        const w = stripTail(hangulOnly(kv[1]));
        if (isNameLike(w)) return w;
      }
    }
    // 같은 줄 앞부분 (예: "홍길동 800101-1234567")
    const m = /^([가-힣]{2,4})\s/.exec(lines[rrnLine]);
    if (m && isNameLike(m[1])) return m[1];
  }
  return null;
}

function findNationality(lines, text) {
  for (const l of lines) {
    const m = /(국\s*적|나\s*라)\s*(?:은|는|이)?\s*:?\s*([가-힣]{2,10})/.exec(l);
    if (m) {
      const v = stripTail(m[2]);
      if (v.length >= 2) return v;
    }
  }
  const found = COUNTRIES.filter((c) => text.includes(c));
  const uniq = [...new Set(found.map((c) => (c === '터키' ? '튀르키예' : c === '남아프리카공화국' ? '남아공' : c)))];
  return uniq.length === 1 ? uniq[0] : null;
}

/** @returns {{clientName,rrn,address,phone,nationality}} 찾지 못한 값은 '' */
export function extractClientInfo(raw) {
  const text = normalizeText(raw);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const rrn = findRrn(text);
  const rrnLine = rrn ? lines.findIndex((l) => findRrn(l)) : -1;
  // 주민번호 숫자가 전화번호로 잡히지 않도록 지우고 찾는다
  const noRrn = rrn ? text.replace(rrn.raw, ' ') : text;
  return {
    clientName: findName(lines, rrnLine) || '',
    rrn: rrn ? rrn.value : '',
    address: findAddress(lines) || '',
    phone: findPhone(noRrn) || '',
    nationality: findNationality(lines, text) || '',
  };
}
