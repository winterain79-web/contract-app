import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_TEMPLATE, TEMPLATES } from './templates/index.js';
import { draftStore, historyStore, requestPersistence, settingsStore, stampStore } from './lib/storage.js';
import { pagesToJpegs, safeFileName } from './lib/exportJpg.js';
import Preview from './components/Preview.jsx';
import StampManager from './components/StampManager.jsx';
import HistorySheet from './components/HistorySheet.jsx';
import ExportDialog from './components/ExportDialog.jsx';

const LH_MAX = 2.0;
const LH_MIN = 1.6;

function loadDraft() {
  const saved = draftStore.load();
  const templateId = saved?.templateId && TEMPLATES[saved.templateId] ? saved.templateId : DEFAULT_TEMPLATE;
  return { templateId, data: TEMPLATES[templateId].normalize(saved?.data) };
}

export default function App() {
  const initial = useMemo(loadDraft, []);
  const [templateId] = useState(initial.templateId);
  const T = TEMPLATES[templateId];
  const [data, setData] = useState(initial.data);
  const [settings, setSettings] = useState(settingsStore.load);
  const [stamps, setStamps] = useState({ seal: null, nameplate: null, ganin: null });
  const [showErrors, setShowErrors] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState('');
  const [lh, setLh] = useState(LH_MAX);
  const [overflow, setOverflow] = useState(false);
  const pageNodes = useRef([]);

  useEffect(() => {
    stampStore.loadAll().then(setStamps);
    requestPersistence();
  }, []);

  // 입력 내용 자동 보관 (기기 안에만)
  useEffect(() => {
    const t = setTimeout(() => draftStore.save({ templateId, data }), 300);
    return () => clearTimeout(t);
  }, [templateId, data]);
  useEffect(() => {
    settingsStore.save(settings);
  }, [settings]);

  const update = useCallback((patch) => setData((d) => ({ ...d, ...patch })), []);
  const v = T.validate(data);
  const errors = showErrors ? v.errors : {};

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  // 페이지 넘침 자동 맞춤: 내용이 바뀌면 줄간격 2.0부터 다시 재고, 넘치면 0.1씩 줄인다.
  const layoutKey = JSON.stringify([data, settings, !!stamps.nameplate]);
  useLayoutEffect(() => {
    setLh(LH_MAX);
  }, [layoutKey]);
  useLayoutEffect(() => {
    const over = pageNodes.current.some((p) => {
      const inner = p?.querySelector('.a4-inner');
      return inner && inner.scrollHeight > inner.clientHeight + 1;
    });
    if (over && lh > LH_MIN + 0.001) setLh((x) => Math.round((x - 0.1) * 10) / 10);
    else setOverflow(over);
  }, [lh, layoutKey]);

  const pageRef = useCallback((i, el) => {
    pageNodes.current[i] = el;
  }, []);

  async function handleSave() {
    if (!v.ok) {
      setShowErrors(true);
      const first = Object.keys(v.errors)[0];
      document.getElementById(`field-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      flash('필수 항목을 확인하세요.');
      return;
    }
    const warns = [...v.warnings];
    if (overflow) warns.push('계약서 내용이 페이지를 넘칩니다. 대행내용을 줄여 주세요.');
    if (!stamps.seal) warns.push('대표 직인이 등록되지 않았습니다.');
    if (warns.length && !confirm(`확인해 주세요:\n\n• ${warns.join('\n• ')}\n\n그래도 저장할까요?`)) return;

    setBusy(true);
    try {
      const nodes = pageNodes.current.slice(0, T.pageCount);
      const blobs = await pagesToJpegs(nodes, { scale: settings.jpgScale, quality: 0.92 });
      const base = safeFileName(T.fileBase(data));
      const files = blobs.map((b, i) => new File([b], `${base}_${i + 1}.jpg`, { type: 'image/jpeg' }));
      historyStore.add({ templateId, data, summary: T.summary(data) });
      setResult({ files, title: base });
    } catch (e) {
      console.error(e);
      alert(`JPG 생성 중 오류가 발생했습니다.\n${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  function handleNew() {
    if (!confirm('입력 내용을 비우고 새 계약서를 작성할까요?\n(도장·명판은 유지됩니다)')) return;
    setData(T.emptyData());
    setShowErrors(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleLoad(entry) {
    const TT = TEMPLATES[entry.templateId] || T;
    setData(TT.normalize(entry.data));
    setShowErrors(false);
    setSheet(null);
    window.scrollTo({ top: 0 });
    flash(`${entry.summary?.clientName || '이력'} 계약서를 불러왔습니다.`);
  }

  const Pages = T.Pages;
  const errorCount = Object.keys(v.errors).length;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <strong>대행계약서</strong>
          <span>{T.name}</span>
        </div>
        <div className="top-actions">
          <button type="button" onClick={() => setSheet('history')}>이력</button>
          <button type="button" onClick={handleNew}>새 계약서</button>
        </div>
      </header>

      <main>
        <T.Form data={data} update={update} errors={errors} />

        <section className="card">
          <h2>
            미리보기 <small>A4 · 2쪽{lh < LH_MAX ? ` · 줄간격 ${lh.toFixed(1)}로 맞춤` : ''}</small>
          </h2>
          {overflow && <div className="banner warn">내용이 페이지를 넘칩니다. 대행내용을 줄여 주세요.</div>}
          <Preview>
            <Pages data={data} stamps={stamps} settings={settings} lineHeight={lh} />
          </Preview>
        </section>

        <StampManager stamps={stamps} setStamps={setStamps} settings={settings} setSettings={setSettings} flash={flash} />

        <p className="footnote">입력 내용·도장·이력은 이 기기 안에만 저장되며 외부로 전송되지 않습니다.</p>
      </main>

      <div className="savebar">
        <div className="savebar-status">
          {showErrors && errorCount > 0 ? (
            <span className="bad">필수 {errorCount}개 누락</span>
          ) : v.warnings.length ? (
            <span className="warnc">경고 {v.warnings.length}</span>
          ) : (
            <span className="okc">입력 완료</span>
          )}
        </div>
        <button type="button" className="primary" disabled={busy} onClick={handleSave}>
          {busy ? '만드는 중…' : 'JPG로 저장'}
        </button>
      </div>

      {/* JPG 변환용 실제 크기 페이지 (화면 밖). 넘침 측정에도 쓴다. */}
      <div data-export-host aria-hidden="true" className="export-host">
        <Pages data={data} stamps={stamps} settings={settings} lineHeight={lh} pageRef={pageRef} />
      </div>

      {sheet === 'history' && <HistorySheet onClose={() => setSheet(null)} onLoad={handleLoad} />}
      {result && <ExportDialog result={result} onClose={() => setResult(null)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
