import { useState } from 'react';
import { processStampFile } from '../lib/imageTools.js';
import { stampStore } from '../lib/storage.js';

const SLOTS = [
  { key: 'seal', label: '대표 직인', hint: '2쪽 (인) 위, 명판 오른쪽 끝에 찍힘' },
  { key: 'nameplate', label: '명판', hint: '없으면 파란 글씨 명판으로 표시' },
  { key: 'ganin', label: '간인', hint: '없으면 대표 직인을 간인으로 사용. 반쪽 이미지도 가능' },
];

export default function StampManager({ stamps, setStamps, settings, setSettings, flash }) {
  const [busyKey, setBusyKey] = useState(null);
  const registered = SLOTS.filter((s) => stamps[s.key]).length;

  async function onFile(key, file) {
    if (!file) return;
    setBusyKey(key);
    try {
      const st = await processStampFile(file);
      await stampStore.save(key, st);
      setStamps((s) => ({ ...s, [key]: st }));
      flash(st.removedWhite ? '등록했습니다 (흰 배경을 투명 처리함).' : '등록했습니다.');
    } catch (e) {
      alert(e.message || String(e));
    } finally {
      setBusyKey(null);
    }
  }

  async function onRemove(key) {
    if (!confirm('이 이미지를 삭제할까요?')) return;
    await stampStore.remove(key);
    setStamps((s) => ({ ...s, [key]: null }));
  }

  return (
    <details className="card" open={registered === 0}>
      <summary>
        <h2>
          도장 · 명판 관리 <small>{registered}/3 등록</small>
        </h2>
      </summary>
      <div className="stamp-grid">
        {SLOTS.map(({ key, label, hint }) => (
          <div className="stamp-slot" key={key}>
            <div className="stamp-thumb">
              {stamps[key] ? <img src={stamps[key].src} alt={label} /> : <span>없음</span>}
            </div>
            <div className="stamp-meta">
              <strong>{label}</strong>
              <small>{hint}</small>
              <div className="stamp-btns">
                <label className="btn-sm">
                  {busyKey === key ? '처리 중…' : stamps[key] ? '바꾸기' : '올리기'}
                  <input type="file" accept="image/png,image/*" hidden onChange={(e) => { onFile(key, e.target.files?.[0]); e.target.value = ''; }} />
                </label>
                {stamps[key] && (
                  <button type="button" className="btn-sm ghost" onClick={() => onRemove(key)}>
                    삭제
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="hint">투명 PNG 권장. 흰 배경 이미지는 자동으로 배경을 투명하게 바꿉니다. 이미지는 이 기기에만 저장됩니다.</p>

      <div className="settings">
        <div className="field">
          <label>명판 폭: {settings.nameplateWidth}mm</label>
          <input
            type="range"
            min="40"
            max="85"
            step="1"
            value={settings.nameplateWidth}
            onChange={(e) => setSettings((s) => ({ ...s, nameplateWidth: Number(e.target.value) }))}
          />
        </div>
        <div className="field">
          <label>계약서 글꼴</label>
          <select value={settings.fontMode} onChange={(e) => setSettings((s) => ({ ...s, fontMode: e.target.value }))}>
            <option value="embedded">내장 Noto Sans KR (기기마다 동일)</option>
            <option value="system">시스템 글꼴 (맑은 고딕 · Apple SD 고딕)</option>
          </select>
        </div>
        <div className="field">
          <label>JPG 배율</label>
          <select value={settings.jpgScale} onChange={(e) => setSettings((s) => ({ ...s, jpgScale: Number(e.target.value) }))}>
            <option value={2}>2배 (약 1588×2245, 가벼움)</option>
            <option value={2.5}>2.5배 (약 1984×2806, 기본)</option>
          </select>
        </div>
      </div>
    </details>
  );
}
