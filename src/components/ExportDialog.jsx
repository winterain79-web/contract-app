import { useEffect, useMemo, useState } from 'react';
import { canShareFiles, downloadFile, shareFiles } from '../lib/exportJpg.js';

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
  const [saved, setSaved] = useState(() => files.map(() => false));

  // 휴대전화는 한 번 탭에 파일 1개만 내려받을 수 있어 쪽마다 버튼을 둔다.
  const saveOne = (i) => {
    downloadFile(files[i]);
    setSaved((s) => s.map((v, j) => (j === i ? true : v)));
  };

  async function onShare() {
    try {
      await shareFiles(files, title);
      setMsg('공유했습니다.');
    } catch (e) {
      if (e?.name !== 'AbortError') {
        setMsg('공유하지 못했습니다. 아래 버튼으로 한 쪽씩 저장해 주세요.');
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
        </div>
        <div className="save-row">
          {files.map((f, i) => (
            <button type="button" key={f.name} className={saved[i] ? 'done' : ''} onClick={() => saveOne(i)}>
              {saved[i] ? `✓ ${i + 1}쪽 저장함` : `${i + 1}쪽 저장`}
            </button>
          ))}
        </div>
        {msg && <p className="hint center">{msg}</p>}
        <p className="hint center">공유하기는 2장을 한 번에 보냅니다. 저장은 1쪽·2쪽 버튼을 각각 눌러 주세요. 이미지를 길게 눌러 사진 앱에 저장할 수도 있습니다. 작성 이력에 기록되었습니다.</p>
      </div>
    </div>
  );
}
