// 휴대전화 안에서 글자 인식 (Tesseract). 사진은 어디로도 전송되지 않는다.
// 엔진·한국어 데이터는 앱과 같은 주소의 /ocr/ 에서 받으며, 한 번 받으면 기기에 저장된다.

/** 사진을 인식하기 좋게 정리: 흑백, 다크모드 반전, 작은 사진 확대 */
async function prepare(file) {
  const bmp = await loadBitmap(file);
  const k = bmp.width < 900 ? 2 : 1;
  const w = bmp.width * k;
  const h = bmp.height * k;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h);
  const px = id.data;
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) {
    const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    px[i] = px[i + 1] = px[i + 2] = g;
    sum += g;
  }
  const dark = sum / (px.length / 4) < 110;
  // 대화 캡처는 글자가 진하고 말풍선·배경이 밝다 → 흑백 두 색으로 나눠 말풍선 색(노란색 등)을 없앤다
  for (let i = 0; i < px.length; i += 4) {
    const g = dark ? 255 - px[i] : px[i];
    px[i] = px[i + 1] = px[i + 2] = g < 150 ? 0 : 255;
  }
  ctx.putImageData(id, 0, 0);
  bmp.close?.();
  return c;
}

function loadBitmap(file) {
  if (window.createImageBitmap) return createImageBitmap(file);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('사진을 열 수 없습니다.'));
    img.src = url;
  });
}

/**
 * 여러 장의 캡처 사진 → 인식된 글자 (사진 순서대로 이어 붙임)
 * onProgress(0~1, 안내문)
 */
export async function recognizeImages(files, onProgress = () => {}) {
  onProgress(0, '글자 인식 준비 중… (처음 한 번은 데이터를 내려받습니다)');
  const { createWorker } = await import('tesseract.js');
  const base = new URL('ocr/', document.baseURI).href;
  let current = 0;
  const worker = await createWorker('kor', 1, {
    workerPath: `${base}worker.min.js`,
    corePath: `${base}core`,
    langPath: `${base}lang`,
    workerBlobURL: false,
    logger: (m) => {
      if (m.status === 'recognizing text') {
        onProgress((current + m.progress) / files.length, `글자 읽는 중… (${current + 1}/${files.length})`);
      }
    },
  });
  try {
    const texts = [];
    for (current = 0; current < files.length; current++) {
      const canvas = await prepare(files[current]);
      const { data } = await worker.recognize(canvas);
      texts.push(data.text);
      canvas.width = canvas.height = 0;
    }
    onProgress(1, '완료');
    return texts.join('\n');
  } finally {
    await worker.terminate();
  }
}
