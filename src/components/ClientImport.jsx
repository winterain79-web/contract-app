import { useState } from 'react';
import { extractClientInfo } from '../lib/extractClient.js';
import { formatRrn } from '../templates/f6/model.js';

const FIELDS = [
  ['clientName', '성명'],
  ['rrn', '주민번호'],
  ['address', '주소'],
  ['phone', '연락처'],
  ['nationality', '배우자 국적'],
];

/**
 * 고객과의 대화 캡처(또는 복사한 글자)에서 의뢰인 정보를 찾아 입력한다.
 * 사진은 이 기기 안에서만 읽는다.
 */
export default function ClientImport({ current, onApply, onClose }) {
  const [step, setStep] = useState('pick'); // pick | paste | reading | review
  const [progress, setProgress] = useState({ p: 0, msg: '' });
  const [text, setText] = useState('');
  const [vals, setVals] = useState(null);
  const [checked, setChecked] = useState({});
  const [error, setError] = useState('');

  const analyze = (t) => {
    const r = extractClientInfo(t);
    setText(t);
    setVals(r);
    setChecked(Object.fromEntries(FIELDS.map(([k]) => [k, !!r[k]])));
    setStep('review');
  };

  async function onFiles(list) {
    const files = [...(list || [])];
    if (!files.length) return;
    setError('');
    setStep('reading');
    try {
      const { recognizeImages } = await import('../lib/ocr.js');
      const t = await recognizeImages(files, (p, msg) => setProgress({ p, msg }));
      analyze(t);
    } catch (e) {
      console.error(e);
      setError(`글자를 읽지 못했습니다. ${navigator.onLine ? '' : '(처음 한 번은 인터넷 연결이 필요합니다) '}${e?.message || ''}`);
      setStep('pick');
    }
  }

  const found = vals ? FIELDS.filter(([k]) => vals[k]).length : 0;

  function apply() {
    const patch = {};
    for (const [k] of FIELDS) if (checked[k] && vals[k].trim()) patch[k] = k === 'rrn' ? formatRrn(vals[k]) : vals[k].trim();
    onApply(patch);
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="대화에서 고객정보 가져오기">
        <div className="sheet-head">
          <h2>대화에서 고객정보 가져오기</h2>
          <button type="button" className="x" onClick={onClose} aria-label="닫기">✕</button>
        </div>

        {step === 'pick' && (
          <>
            <label className="big-pick">
              📷 대화 캡처 사진 고르기
              <small>여러 장 한꺼번에 골라도 됩니다</small>
              <input type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
            </label>
            <button type="button" className="big-pick ghost" onClick={() => setStep('paste')}>
              📋 대화 글자 붙여넣기
              <small>카톡에서 메시지를 길게 눌러 복사한 경우 (더 정확)</small>
            </button>
            {error && <div className="banner warn">{error}</div>}
            <p className="hint">
              사진은 이 휴대전화 안에서만 읽고 어디에도 보내지 않습니다. 처음 한 번은 글자 인식 데이터(약 5MB)를 내려받고, 그 뒤로는 인터넷 없이도
              됩니다. 성명·주민등록번호·주소·연락처·국적을 찾습니다.
            </p>
          </>
        )}

        {step === 'paste' && (
          <>
            <textarea
              className="paste-box"
              rows={8}
              autoFocus
              placeholder="고객과 주고받은 대화 내용을 여기에 붙여넣으세요"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="result-actions">
              <button type="button" className="primary" disabled={!text.trim()} onClick={() => analyze(text)}>
                정보 찾기
              </button>
              <button type="button" onClick={() => setStep('pick')}>뒤로</button>
            </div>
          </>
        )}

        {step === 'reading' && (
          <div className="reading">
            <div className="bar"><span style={{ width: `${Math.round(progress.p * 100)}%` }} /></div>
            <p>{progress.msg || '준비 중…'}</p>
            <p className="hint">사진 1장에 10~30초 정도 걸릴 수 있습니다.</p>
          </div>
        )}

        {step === 'review' && vals && (
          <>
            <p className={`banner ${found ? 'info' : 'warn'}`}>
              {found
                ? `${found}개 항목을 찾았습니다. 글자 인식은 틀릴 수 있으니 꼭 확인하고 고쳐 주세요.`
                : '정보를 찾지 못했습니다. 아래 인식된 글자를 확인하거나 직접 입력해 주세요.'}
            </p>
            <div className="import-rows">
              {FIELDS.map(([k, label]) => (
                <div className={`import-row ${checked[k] ? '' : 'off'}`} key={k}>
                  <label className="chk">
                    <input type="checkbox" checked={!!checked[k]} onChange={(e) => setChecked((c) => ({ ...c, [k]: e.target.checked }))} />
                    <span>{label}</span>
                  </label>
                  {(() => {
                    const props = {
                      value: vals[k],
                      placeholder: '못 찾음',
                      onChange: (e) => {
                        const v = k === 'rrn' ? formatRrn(e.target.value) : e.target.value.replace(/\n/g, ' ');
                        setVals((x) => ({ ...x, [k]: v }));
                        setChecked((c) => ({ ...c, [k]: !!v.trim() }));
                      },
                    };
                    return k === 'address' ? (
                      <textarea rows={3} {...props} />
                    ) : (
                      <input inputMode={k === 'rrn' ? 'numeric' : k === 'phone' ? 'tel' : undefined} {...props} />
                    );
                  })()}
                  {checked[k] && current[k] && current[k] !== vals[k] && <small className="overwrite">기존 값 &lsquo;{current[k]}&rsquo;을 바꿉니다</small>}
                </div>
              ))}
            </div>
            <details className="raw">
              <summary>인식된 글자 보기 · 고쳐서 다시 찾기</summary>
              <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} />
              <button type="button" className="btn-sm" onClick={() => analyze(text)}>다시 찾기</button>
            </details>
            <div className="result-actions">
              <button type="button" className="primary" disabled={!FIELDS.some(([k]) => checked[k] && vals[k].trim())} onClick={apply}>
                체크한 항목 입력하기
              </button>
              <button type="button" onClick={() => { setStep('pick'); setVals(null); setText(''); }}>
                다른 사진으로 다시
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
