import { useLayoutEffect, useRef } from 'react';
import { formatMan } from '../../lib/koreanMoney.js';
import {
  ACCOUNTS, APPLY_TYPES, CUSTOM_PRESET, EXCLUDE_OPTIONS, QUICK_INSERTS, TIMING_OPTIONS,
  dutyLines, fillPreset, presetsFor,
} from './constants.js';
import { amounts, formatRrn } from './model.js';

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

export default function F6Form({ data, update, errors }) {
  const taRef = useRef(null);
  // 줄바꿈된 내용까지 다 보이도록 높이 자동 조절
  useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight + 2}px`;
  }, [data.duties]);
  const a = amounts(data);
  const presets = presetsFor(data.applyType);

  const setNationality = (nationality) => {
    const patch = { nationality };
    if (!data.dutiesEdited && data.presetId !== CUSTOM_PRESET) patch.duties = fillPreset(data.presetId, nationality);
    update(patch);
  };

  const setApplyType = (applyType) => {
    if (applyType === data.applyType) return;
    const first = presetsFor(applyType)[0];
    if (data.dutiesEdited && !confirm('신청 유형을 바꾸면 수정한 대행내용이 기본 문구로 바뀝니다. 계속할까요?')) {
      update({ applyType, presetId: CUSTOM_PRESET });
      return;
    }
    update({ applyType, presetId: first.id, duties: fillPreset(first.id, data.nationality), dutiesEdited: false });
  };

  const setPreset = (presetId) => {
    if (presetId === CUSTOM_PRESET) {
      update({ presetId, dutiesEdited: true });
      return;
    }
    if (data.dutiesEdited && !confirm('수정한 대행내용을 기본 문구로 바꿀까요?')) return;
    update({ presetId, duties: fillPreset(presetId, data.nationality), dutiesEdited: false });
  };

  // 커서가 있는 줄 끝에 부가 문구를 붙인다
  const quickInsert = (txt) => {
    const ta = taRef.current;
    const v = data.duties;
    const pos = ta ? ta.selectionStart ?? v.length : v.length;
    let end = v.indexOf('\n', pos);
    if (end < 0) end = v.length;
    const start = v.lastIndexOf('\n', pos - 1) + 1;
    const line = v.slice(start, end);
    if (line.includes(txt)) return;
    const next = v.slice(0, end).replace(/\s+$/, '') + ' ' + txt + v.slice(end);
    update({ duties: next, dutiesEdited: true });
    requestAnimationFrame(() => {
      if (!ta) return;
      const caret = end + txt.length + 1;
      ta.focus();
      ta.setSelectionRange(caret, caret);
    });
  };

  const sumMid = (a.deposit || 0) + (a.mid || 0);
  const balPlaceholder = a.total !== null && a.total - sumMid >= 0 ? `자동: ${a.total - sumMid}` : '';
  const lines = dutyLines(data.duties);

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
        <Field label="제4조 대행내용 기본 문구">
          <select value={data.presetId} onChange={(e) => setPreset(e.target.value)}>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            <option value={CUSTOM_PRESET}>직접 입력</option>
          </select>
        </Field>
        <Field
          label={`대행내용 (한 줄에 한 항목 · 번호 자동)${data.dutiesEdited && data.presetId !== CUSTOM_PRESET ? ' · 수정됨' : ''}`}
          hint={`${lines.length}개 항목 → (1)~(${lines.length || 1})`}
        >
          <textarea
            ref={taRef}
            rows={4}
            value={data.duties}
            onChange={(e) => update({ duties: e.target.value, dutiesEdited: true })}
          />
          <div className="chips">
            {QUICK_INSERTS.map((q) => (
              <button type="button" key={q} className="chip" onMouseDown={(e) => e.preventDefault()} onClick={() => quickInsert(q)}>
                + {q}
              </button>
            ))}
            {data.dutiesEdited && data.presetId !== CUSTOM_PRESET && (
              <button type="button" className="chip ghost" onClick={() => update({ duties: fillPreset(data.presetId, data.nationality), dutiesEdited: false })}>
                ↺ 기본 문구로
              </button>
            )}
          </div>
          <div className="hint">부가 문구는 커서가 있는 줄 끝에 붙습니다.</div>
        </Field>
      </section>

      {/* 3-2 대행비용 */}
      <section className="card">
        <h2>대행비용</h2>
        <div className="row2">
          <Field label="총 비용" hint={a.total !== null ? formatMan(a.total) : ''}>
            <ManInput value={data.total} onChange={(total) => update({ total })} placeholder="200" />
          </Field>
          <Field label="착수금" hint={a.deposit !== null ? formatMan(a.deposit) : ''}>
            <ManInput value={data.deposit} onChange={(deposit) => update({ deposit })} placeholder="100" />
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
          <div className="row2">
            <Field label="중도금 시점">
              <input list="timing-options" value={data.midWhen} placeholder="선택 또는 입력" onChange={(e) => update({ midWhen: e.target.value })} />
            </Field>
            <Field label="중도금 금액" hint={a.mid !== null ? formatMan(a.mid) : ''}>
              <ManInput value={data.midAmount} onChange={(midAmount) => update({ midAmount })} />
            </Field>
          </div>
        )}
        <div className="row2">
          <Field label="잔금 시점">
            <input list="timing-options" value={data.balWhen} placeholder="선택 또는 입력" onChange={(e) => update({ balWhen: e.target.value })} />
          </Field>
          <Field label="잔금 금액" hint={a.bal !== null ? `${formatMan(a.bal)}${a.balAuto ? ' (자동)' : ''}` : ''}>
            <ManInput value={data.balAmount} onChange={(balAmount) => update({ balAmount })} placeholder={balPlaceholder} />
          </Field>
        </div>
        <datalist id="timing-options">
          {TIMING_OPTIONS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <div className="timing-chips">
          {TIMING_OPTIONS.map((t) => (
            <button type="button" key={t} className="chip small" onClick={() => update(data.payMode === 'twice' && !data.midWhen ? { midWhen: t } : { balWhen: t })}>
              {t}
            </button>
          ))}
          <div className="hint">버튼을 누르면 {data.payMode === 'twice' && !data.midWhen ? '중도금' : '잔금'} 시점에 들어갑니다.</div>
        </div>

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
