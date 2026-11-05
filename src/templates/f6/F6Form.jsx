import { useLayoutEffect, useRef, useState } from 'react';
import { formatMan } from '../../lib/koreanMoney.js';
import {
  ACCOUNTS, APPLY_TYPES, CUSTOM_OPT, EXCLUDE_OPTIONS, QUICK_INSERTS, TIMING_OPTIONS,
  fillNat, optionText, optionsFor,
} from './constants.js';
import { amounts, emptySlots, formatRrn } from './model.js';

function Field({ label, error, hint, children, id }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`} id={id ? `field-${id}` : undefined}>
      <label>{label}</label>
      {children}
      {error ? <div className="err">{error}</div> : hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}

function Seg({ value, options, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button type="button" key={o.id} className={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ManInput({ value, onChange, placeholder }) {
  return (
    <div className="man-input">
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))}
      />
      <span>만원</span>
    </div>
  );
}

/** 늘어나는 입력칸 (긴 문구도 다 보이게) */
function AutoText({ value, onChange, onFocus, placeholder, className }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      className={className}
      value={value}
      placeholder={placeholder}
      onFocus={onFocus}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
    />
  );
}

/** 시점: 직접 입력 + 자주 쓰는 시점 버튼 */
function TimingField({ label, value, onChange }) {
  return (
    <Field label={label} hint="버튼을 누르거나 칸에 직접 입력하세요.">
      <div className="clearable">
        <input value={value} placeholder="직접 입력" onChange={(e) => onChange(e.target.value)} />
        {value && (
          <button type="button" className="clear-x" aria-label="지우기" onClick={() => onChange('')}>
            ✕
          </button>
        )}
      </div>
      <div className="chips">
        {TIMING_OPTIONS.map((t) => (
          <button type="button" key={t} className={`chip small ${value === t ? 'on' : ''}`} onClick={() => onChange(t)}>
            {t}
          </button>
        ))}
      </div>
    </Field>
  );
}

export default function F6Form({ data, update, errors }) {
  const a = amounts(data);
  const options = optionsFor(data.applyType);
  const [active, setActive] = useState(0); // 부가 문구를 붙일 항목
  const [customExtra, setCustomExtra] = useState('');

  const setSlot = (i, patch) => update({ slots: data.slots.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  const setNationality = (nationality) => {
    // 손대지 않은 항목은 국적을 바꾸면 문구도 따라 바뀐다
    const slots = data.slots.map((s) =>
      s.opt && s.opt !== CUSTOM_OPT && !s.edited ? { ...s, text: optionText(s.opt, nationality) } : s
    );
    update({ nationality, slots });
  };

  const setApplyType = (applyType) => {
    if (applyType === data.applyType) return;
    const filled = data.slots.some((s) => s.opt);
    if (filled && confirm('신청 유형을 바꾸면 대행내용 항목을 비웁니다. 비울까요?\n(취소를 누르면 지금 문구를 직접 입력 상태로 남깁니다)')) {
      update({ applyType, slots: emptySlots() });
    } else {
      update({ applyType, slots: data.slots.map((s) => (s.opt ? { ...s, opt: CUSTOM_OPT, edited: true } : s)) });
    }
  };

  const chooseOpt = (i, opt) => {
    setActive(i);
    if (opt === '') return setSlot(i, { opt: '', text: '', edited: false, extra: '' });
    if (opt === CUSTOM_OPT) return setSlot(i, { opt, text: data.slots[i].opt ? data.slots[i].text : '', edited: true });
    setSlot(i, { opt, text: optionText(opt, data.nationality), edited: false });
  };

  const addExtra = (raw) => {
    const txt = fillNat(raw, data.nationality).trim();
    if (!txt) return;
    const i = data.slots[active]?.opt ? active : data.slots.findLastIndex((s) => s.opt);
    if (i < 0) {
      alert('먼저 부가 문구를 붙일 항목을 선택하세요.');
      return;
    }
    const cur = data.slots[i].extra.trim();
    if (cur.includes(txt)) return;
    setSlot(i, { extra: cur ? `${cur} ${txt}` : txt });
    setActive(i);
  };

  // 계약서에 실제로 찍힐 번호 (빈 항목은 건너뜀)
  let n = 0;
  const numbers = data.slots.map((s) => (s.opt && (s.text.trim() || s.extra.trim()) ? ++n : null));
  const activeNo = numbers[active];
  const quick = [...QUICK_INSERTS.common, ...(QUICK_INSERTS[data.applyType] || [])];

  const sumMid = (a.deposit || 0) + (a.mid || 0);
  const balPlaceholder = a.total !== null && a.total - sumMid >= 0 ? `자동: ${a.total - sumMid}` : '0';

  return (
    <>
      {/* 3-1 건별 내용 */}
      <section className="card">
        <h2>건별 내용</h2>
        <Field label="배우자 국적" error={errors.nationality} id="nationality">
          <input value={data.nationality} placeholder="예: 미얀마" onChange={(e) => setNationality(e.target.value)} />
        </Field>
        <Field label="신청 유형">
          <Seg value={data.applyType} options={APPLY_TYPES} onChange={setApplyType} />
        </Field>

        <div className="field">
          <label>제4조 대행내용 (최대 5개 · 비운 항목은 빠지고 번호는 자동)</label>
          {data.slots.map((s, i) => (
            <div key={i} className={`slot ${s.opt ? 'filled' : ''} ${active === i ? 'active' : ''}`} onClick={() => setActive(i)}>
              <div className="slot-head">
                <span className="slot-no">{numbers[i] ? `(${numbers[i]})` : '—'}</span>
                <select value={s.opt} onChange={(e) => chooseOpt(i, e.target.value)}>
                  <option value="">{s.opt ? '— 이 항목 비우기 —' : '항목 선택 (비워 두면 생략)'}</option>
                  {options.map(([id, t]) => (
                    <option key={id} value={id}>
                      {fillNat(t, data.nationality)}
                    </option>
                  ))}
                  <option value={CUSTOM_OPT}>✎ 직접 입력</option>
                </select>
              </div>
              {s.opt && (
                <>
                  <AutoText
                    className="slot-text"
                    value={s.text}
                    placeholder="문구를 입력하세요"
                    onFocus={() => setActive(i)}
                    onChange={(text) => setSlot(i, { text, edited: true })}
                  />
                  {s.edited && s.opt !== CUSTOM_OPT && (
                    <button type="button" className="link-btn" onClick={() => setSlot(i, { text: optionText(s.opt, data.nationality), edited: false })}>
                      ↺ 원래 문구로
                    </button>
                  )}
                  {s.extra !== '' && (
                    <div className="slot-extra">
                      <span>부가</span>
                      <AutoText value={s.extra} onFocus={() => setActive(i)} onChange={(extra) => setSlot(i, { extra })} />
                      <button type="button" className="clear-x static" aria-label="부가 문구 삭제" onClick={() => setSlot(i, { extra: '' })}>
                        ✕
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <div className="field extra-panel">
          <label>부가 문구 → {activeNo ? `(${activeNo})번 항목 끝에 붙이기` : '붙일 항목을 먼저 누르세요'}</label>
          <div className="chips">
            {quick.map((q) => (
              <button type="button" key={q} className="chip" onClick={() => addExtra(q)}>
                + {fillNat(q, data.nationality)}
              </button>
            ))}
          </div>
          <div className="inline-add">
            <input
              value={customExtra}
              placeholder="직접 입력 예: (※ 번역 공증 포함)"
              onChange={(e) => setCustomExtra(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addExtra(customExtra);
                  setCustomExtra('');
                }
              }}
            />
            <button
              type="button"
              className="btn-sm"
              onClick={() => {
                addExtra(customExtra);
                setCustomExtra('');
              }}
            >
              붙이기
            </button>
          </div>
          <div className="hint">붙인 부가 문구는 해당 항목 아래 &lsquo;부가&rsquo; 칸에서 고치거나 ✕로 지울 수 있습니다.</div>
        </div>
      </section>

      {/* 3-2 대행비용 */}
      <section className="card">
        <h2>대행비용</h2>
        <div className="row2">
          <Field label="총 비용" hint={a.total !== null ? formatMan(a.total) : ''}>
            <ManInput value={data.total} onChange={(total) => update({ total })} placeholder="0" />
          </Field>
          <Field label="착수금" hint={a.deposit !== null ? formatMan(a.deposit) : ''}>
            <ManInput value={data.deposit} onChange={(deposit) => update({ deposit })} placeholder="0" />
          </Field>
        </div>
        <Field label="잔금 지급 방식">
          <Seg
            value={data.payMode}
            options={[{ id: 'once', label: '한 번에 (잔금)' }, { id: 'twice', label: '두 번에 (중도금+잔금)' }]}
            onChange={(payMode) => update({ payMode })}
          />
        </Field>
        {data.payMode === 'twice' && (
          <>
            <TimingField label="중도금 시점" value={data.midWhen} onChange={(midWhen) => update({ midWhen })} />
            <Field label="중도금 금액" hint={a.mid !== null ? formatMan(a.mid) : ''}>
              <ManInput value={data.midAmount} onChange={(midAmount) => update({ midAmount })} placeholder="0" />
            </Field>
          </>
        )}
        <TimingField label="잔금 시점" value={data.balWhen} onChange={(balWhen) => update({ balWhen })} />
        <Field label="잔금 금액" hint={a.bal !== null ? `${formatMan(a.bal)}${a.balAuto ? ' (자동 계산 · 비워 두면 총 비용−착수금' + (data.payMode === 'twice' ? '−중도금' : '') + ')' : ''}` : ''}>
          <ManInput value={data.balAmount} onChange={(balAmount) => update({ balAmount })} placeholder={balPlaceholder} />
        </Field>

        <Field label="제5조 (3) 대행비용에 포함되지 않는 사항">
          <select value={data.excludeMode} onChange={(e) => update({ excludeMode: e.target.value })}>
            {EXCLUDE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          {data.excludeMode === 'custom' && (
            <input style={{ marginTop: 8 }} value={data.excludeCustom} placeholder="직접 입력" onChange={(e) => update({ excludeCustom: e.target.value })} />
          )}
        </Field>
        <Field label="입금계좌">
          <Seg
            value={data.account}
            options={Object.entries(ACCOUNTS).map(([id, v]) => ({ id, label: v.label }))}
            onChange={(account) => update({ account })}
          />
          <div className="hint">{ACCOUNTS[data.account]?.text}</div>
        </Field>
      </section>

      {/* 3-3 의뢰인·날짜 */}
      <section className="card">
        <h2>의뢰인 · 날짜</h2>
        <Field label="성명" error={errors.clientName} id="clientName">
          <input value={data.clientName} autoComplete="off" onChange={(e) => update({ clientName: e.target.value })} />
        </Field>
        <Field label="주민등록번호" error={errors.rrn} id="rrn">
          <input
            inputMode="numeric"
            value={data.rrn}
            placeholder="000000-0000000"
            autoComplete="off"
            onChange={(e) => update({ rrn: formatRrn(e.target.value) })}
          />
        </Field>
        <Field label="주소" error={errors.address} id="address">
          <input value={data.address} autoComplete="off" onChange={(e) => update({ address: e.target.value })} />
        </Field>
        <Field label="연락처 (선택)">
          <input inputMode="tel" value={data.phone} autoComplete="off" placeholder="010-0000-0000" onChange={(e) => update({ phone: e.target.value })} />
        </Field>
        <Field label="계약일" error={errors.contractDate} id="contractDate" hint="제7조 (2) 착수금 지급기한과 말미 계약일에 함께 들어갑니다.">
          <input type="date" value={data.contractDate} onChange={(e) => update({ contractDate: e.target.value })} />
        </Field>
      </section>
    </>
  );
}
