import html2canvas from 'html2canvas';

/** A4 페이지 DOM들 → JPEG Blob 배열 */
export async function pagesToJpegs(nodes, { scale = 2.5, quality = 0.92 } = {}) {
  if (document.fonts?.ready) await document.fonts.ready;
  await waitImages(nodes);
  const blobs = [];
  for (const node of nodes) {
    const canvas = await html2canvas(node, {
      scale,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      windowWidth: Math.max(1024, node.offsetWidth + 40),
      onclone: (doc) => {
        // 복제본에서 숨김 컨테이너를 화면 안으로 꺼내 정확한 위치로 그린다.
        const host = doc.querySelector('[data-export-host]');
        if (host) host.setAttribute('style', 'position:absolute;left:0;top:0;');
      },
    });
    const blob = await new Promise((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('JPG 변환 실패'))), 'image/jpeg', quality)
    );
    blobs.push(blob);
    canvas.width = canvas.height = 0; // iOS 메모리 해제
  }
  return blobs;
}

function waitImages(nodes) {
  const imgs = nodes.flatMap((n) => [...n.querySelectorAll('img')]);
  return Promise.all(
    imgs.map((img) => (img.complete ? img.decode?.().catch(() => {}) : new Promise((r) => { img.onload = img.onerror = r; })))
  );
}

export const safeFileName = (s) => String(s || '').replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^_+|_+$/g, '') || '미입력';

export const canShareFiles = (files) => {
  try {
    return !!(navigator.share && navigator.canShare && navigator.canShare({ files }));
  } catch {
    return false;
  }
};

export async function shareFiles(files, title) {
  await navigator.share({ files, title });
}

/**
 * 파일 1개 다운로드. 휴대전화 브라우저는 한 번 탭에 다운로드 1개만 허용하므로
 * 반드시 버튼 클릭 처리 안에서 바로(기다림 없이) 호출한다.
 */
export function downloadFile(f) {
  const url = URL.createObjectURL(f);
  const a = document.createElement('a');
  a.href = url;
  a.download = f.name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 30000);
}
