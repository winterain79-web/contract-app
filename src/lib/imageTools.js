/**
 * 업로드한 도장 이미지를 정리한다.
 * 1) 최대 1200px로 축소
 * 2) 투명 영역이 없는 이미지(스캔본 등)는 흰 배경을 투명하게 바꾼다
 * 3) 바깥 투명 여백을 잘라낸다 → 위치 계산이 정확해진다
 * 반환: { src: PNG dataURL, w, h }
 */
export async function processStampFile(file, { removeWhite = 'auto' } = {}) {
  const img = await loadImage(file);
  const MAX = 1200;
  const k = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * k));
  const h = Math.max(1, Math.round(img.naturalHeight * k));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h);
  const px = id.data;

  let hasAlpha = false;
  for (let i = 3; i < px.length; i += 4) {
    if (px[i] < 250) {
      hasAlpha = true;
      break;
    }
  }
  const doRemove = removeWhite === true || (removeWhite === 'auto' && !hasAlpha);
  if (doRemove) {
    // 밝은 픽셀일수록 투명하게 (부드러운 경계)
    for (let i = 0; i < px.length; i += 4) {
      const lo = Math.min(px[i], px[i + 1], px[i + 2]);
      if (lo >= 240) px[i + 3] = 0;
      else if (lo > 200) px[i + 3] = Math.round(px[i + 3] * ((240 - lo) / 40));
    }
  }

  // 투명 여백 자르기
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 12) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error('이미지에서 도장을 찾지 못했습니다.');
  ctx.putImageData(id, 0, 0);
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  out.getContext('2d').drawImage(c, x0, y0, cw, ch, 0, 0, cw, ch);
  return { src: out.toDataURL('image/png'), w: cw, h: ch, name: file.name, removedWhite: doRemove };
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 읽을 수 없습니다.'));
    };
    img.src = url;
  });
}
