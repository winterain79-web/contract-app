import { useState } from 'react';
import { historyStore } from '../lib/storage.js';

export default function HistorySheet({ onClose, onLoad }) {
  const [list, setList] = useState(historyStore.list);
  const [q, setQ] = useState('');
  const items = list.filter((h) => {
    if (!q.trim()) return true;
    const s = `${h.summary?.clientName || ''} ${h.summary?.nationality || ''}`;
    return s.includes(q.trim());
  });

  const remove = (id) => {
    if (!confirm('이 이력을 삭제할까요?')) return;
    historyStore.remove(id);
    setList(historyStore.list());
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="작성 이력">
        <div className="sheet-head">
          <h2>작성 이력 <small>{list.length}건</small></h2>
          <button type="button" className="x" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        <input className="search" placeholder="의뢰인명·국적 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <ul className="history">
          {items.length === 0 && <li className="empty">{list.length ? '검색 결과가 없습니다.' : 'JPG로 저장하면 여기에 기록됩니다.'}</li>}
          {items.map((h) => (
            <li key={h.id}>
              <button type="button" className="h-main" onClick={() => onLoad(h)}>
                <strong>{h.summary?.clientName || '(이름 없음)'}</strong>
                <span>{h.summary?.nationality || '-'} · 계약일 {h.summary?.contractDate || '-'}</span>
                <small>저장 {new Date(h.savedAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}</small>
              </button>
              <button type="button" className="h-del" onClick={() => remove(h.id)} aria-label="삭제">삭제</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
