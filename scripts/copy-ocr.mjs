// 글자 인식(OCR) 엔진과 한국어 데이터를 public/ocr로 복사한다.
// 외부 CDN 없이 앱과 같은 주소에서 내려받게 하기 위함 (빌드·개발 서버 실행 전에 자동 실행).
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = join(root, 'node_modules');
const out = join(root, 'public', 'ocr');
const files = [
  ['tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'core/tesseract-core-relaxedsimd-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'core/tesseract-core-simd-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-lstm.wasm.js', 'core/tesseract-core-lstm.wasm.js'],
  ['@tesseract.js-data/kor/4.0.0_best_int/kor.traineddata.gz', 'lang/kor.traineddata.gz'],
];
for (const [from, to] of files) {
  const src = join(nm, from);
  if (!existsSync(src)) throw new Error(`OCR 파일 없음: ${from} (npm install을 먼저 실행하세요)`);
  const dst = join(out, to);
  mkdirSync(dirname(dst), { recursive: true });
  cpSync(src, dst);
}
console.log('OCR 파일 복사 완료 → public/ocr');
