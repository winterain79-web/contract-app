import { parseMan } from '../../lib/koreanMoney.js';
import { EXCLUDE_OPTIONS, fillPreset } from './constants.js';

export const todayISO = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** 빈 계약서 데이터. 필드를 추가할 땐 여기에 기본값을 넣는다(이력 호환). */
export function emptyData() {
  return {
    nationality: '',
    applyType: 'visa',
    presetId: 'A',
    duties: fillPreset('A', ''),
    dutiesEdited: false,
    total: '',
    deposit: '',
    payMode: 'once', // once | twice
    midWhen: '',
    midAmount: '',
    balWhen: '결혼비자(F-6) 서류 발송 시',
    balAmount: '',
    excludeMode: 'default',
    excludeCustom: '',
    account: 'corp',
    clientName: '',
    rrn: '',
    address: '',
    phone: '',
    contractDate: todayISO(),
    // 확장용: 전자서명(의뢰인 서명 이미지 dataURL 등). 지금은 사용하지 않음.
    signature: null,
  };
}

export const normalize = (d) => ({ ...emptyData(), ...(d || {}) });

/** 금액 계산: 잔금이 비어 있으면 총액 − 착수금 − 중도금으로 자동 계산 */
export function amounts(d) {
  const total = parseMan(d.total);
  const deposit = parseMan(d.deposit);
  const mid = d.payMode === 'twice' ? parseMan(d.midAmount) : null;
  let bal = parseMan(d.balAmount);
  let balAuto = false;
  if (bal === null && total !== null) {
    const rest = total - (deposit || 0) - (mid || 0);
    if (rest >= 0) {
      bal = rest;
      balAuto = true;
    }
  }
  return { total, deposit, mid, bal, balAuto };
}

export function excludeText(d) {
  if (d.excludeMode === 'none') return null;
  if (d.excludeMode === 'custom') return (d.excludeCustom || '').trim();
  return (EXCLUDE_OPTIONS.find((o) => o.id === d.excludeMode) || EXCLUDE_OPTIONS[0]).text;
}

export function dateParts(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

export const RRN_RE = /^\d{6}-\d{7}$/;

/** 주민등록번호 입력 시 하이픈 자동 삽입 */
export function formatRrn(v) {
  const digits = String(v).replace(/\D/g, '').slice(0, 13);
  return digits.length > 6 ? `${digits.slice(0, 6)}-${digits.slice(6)}` : digits;
}

/** 저장 전 검증: errors(저장 막음) / warnings(저장 허용) */
export function validate(d) {
  const errors = {};
  const warnings = [];
  if (!d.nationality.trim()) errors.nationality = '배우자 국적을 입력하세요.';
  if (!d.clientName.trim()) errors.clientName = '의뢰인 성명을 입력하세요.';
  if (!d.rrn.trim()) errors.rrn = '주민등록번호를 입력하세요.';
  else if (!RRN_RE.test(d.rrn.trim())) errors.rrn = '형식: 000000-0000000';
  if (!d.address.trim()) errors.address = '주소를 입력하세요.';
  if (!dateParts(d.contractDate)) errors.contractDate = '계약일을 선택하세요.';

  if (!d.phone.trim()) warnings.push('연락처가 비어 있습니다. 계약서에 연락처 줄이 빠집니다.');

  const a = amounts(d);
  if (a.total === null) warnings.push('총 비용이 비어 있습니다.');
  if (a.deposit === null) warnings.push('착수금이 비어 있습니다.');
  if (a.total !== null && a.deposit !== null && a.deposit > a.total)
    warnings.push('착수금이 총 비용보다 큽니다.');
  if (d.payMode === 'twice' && a.mid === null) warnings.push('중도금 금액이 비어 있습니다.');
  if (a.total !== null && a.bal !== null) {
    const sum = (a.deposit || 0) + (a.mid || 0) + a.bal;
    if (sum !== a.total)
      warnings.push(`착수금${d.payMode === 'twice' ? ' + 중도금' : ''} + 잔금(${sum.toLocaleString()}만원) ≠ 총 비용(${a.total.toLocaleString()}만원)`);
  } else if (a.total !== null && a.bal === null) {
    warnings.push('잔금을 계산할 수 없습니다(착수금·중도금 합계가 총 비용보다 큼).');
  }
  if (d.payMode === 'twice' && !d.midWhen.trim()) warnings.push('중도금 시점이 비어 있습니다.');
  if (!d.balWhen.trim()) warnings.push('잔금 시점이 비어 있습니다.');
  if (d.excludeMode === 'custom' && !d.excludeCustom.trim())
    warnings.push('제5조 (3) 직접 입력 내용이 비어 있습니다.');
  return { errors, warnings, ok: Object.keys(errors).length === 0 };
}
