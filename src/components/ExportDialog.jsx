import { useEffect, useMemo, useState } from 'react';
import { canShareFiles, downloadFiles, shareFiles } from '../lib/exportJpg.js';

/**
 * 공유 시트는 사용자 탭 직후에만 열 수 있어(iOS Safari),
 * JPG를 먼저 만든 뒤 이 창에서 "공유하기"를 누르게 한다.
 */
export default function ExportDialog({ result, onClose }) {
  const { files, title } = result;
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  const shareable = canShareFiles(files);
  const [msg, setMsg] = useState('');

  async function onShare() {
    try {
      await shareFiles(files, title);
      setMsg('공유했습니다.');
    } catch (e) {
      if (e?.name !== 'AbortError') {
        setMsg('공유하지 못해 파일로 저장합니다.');
        downloadFiles(files);
      }
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="JPG 저장">
        <div className="sheet-head">
          <h2>JPG 완성 <small>{files.length}장</small></h2>
          <button type="button" className="x" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        <div className="result-thumbs">
          {urls.map((u, i) => (
            <figure key={u}>
              <img src={u} alt={files[i].name} />
              <figcaption>{files[i].name}</figcaption>
            </figure>
          ))}
        </div>
        <div className="result-actions">
          {shareable && (
            <button type="button" className="primary" onClick={onShare}>
              공유하기 (카카오톡·메일 등)
            </button>
          )}
          <button type="button" className={shareable ? '' : 'primary'} onClick={() => downloadFiles(files)}>
            기기에 저장
          </button>
        </div>
        {msg && <p className="hint center">{msg}</p>}
        <p className="hint center">이미지를 길게 눌러 사진 앱에 저장할 수도 있습니다. 작성 이력에 기록되었습니다.</p>
      </div>
    </div>
  );
}
