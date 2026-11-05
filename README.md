# 대행계약서 모바일 작성 앱 (PWA)

더바른행정사법인 행정사 대행 계약서(결혼이민 F-6)를 휴대전화에서 작성하고,
직인·명판·간인이 찍힌 A4 2쪽 완성본을 JPG로 만들어 바로 공유하는 웹앱입니다.

- 서버 없음. 입력 내용·도장 이미지·작성 이력은 **기기 안(localStorage / IndexedDB)에만** 저장되며 외부로 전송되지 않습니다.
- iOS Safari, Android Chrome에서 동작하며 홈 화면에 추가하면 앱처럼 열리고, 한 번 연 뒤에는 오프라인에서도 열립니다.

## 사용 흐름

1. **도장 · 명판 관리**(화면 아래)에서 대표 직인, 명판, 간인 PNG를 한 번 올립니다. 기기에 저장되어 계속 쓰입니다.
   - 명판이 없으면 파란 글씨 명판을 텍스트로 그립니다.
   - 간인이 없으면 대표 직인을 간인으로 씁니다.
   - 간인은 **온전한 원형 도장**을 올리면 1쪽엔 오른쪽 절반, 2쪽엔 왼쪽 절반이 찍힙니다. **이미 반으로 자른 간인 이미지**(가로가 세로의 80% 미만)를 올리면 그대로 양쪽 페이지 왼쪽 가장자리에 찍습니다.
   - 흰 배경 이미지(스캔본)는 자동으로 배경을 투명하게 바꾸고, 바깥 여백을 잘라 냅니다.
2. 건별 내용 → 대행비용 → 의뢰인·날짜를 입력합니다. 아래 미리보기가 실시간으로 바뀝니다.
   - 신청 유형: 사증발급 / 체류자격 변경.
   - 제4조 대행내용은 (1)~(5) 항목마다 문구를 고르거나 직접 입력합니다. 고른 문구는 바로 아래 칸에 나타나 고칠 수 있고, 비워 둔 항목은 빠지며 번호는 자동으로 당겨집니다.
   - 부가 문구는 버튼 또는 직접 입력으로, 선택한 항목 끝에 붙습니다.
   - 시점은 버튼으로 고르거나 직접 입력합니다.
   - 잔금 금액을 비워 두면 `총 비용 − 착수금 − 중도금`으로 자동 계산됩니다.
   - 내용이 길어 페이지를 넘치면 줄간격을 2.0 → 1.6까지 자동으로 줄입니다. 그래도 넘치면 경고합니다.
3. **JPG로 저장** → 1쪽·2쪽 JPG 생성 → **공유하기**(카카오톡·메일 등 공유 시트) 또는 **기기에 저장**.
   - 파일명: `대행계약서_{국적}_{의뢰인성명}_1.jpg`, `_2.jpg`
   - 저장할 때마다 **이력**에 기록됩니다. 상단 `이력`에서 불러와 재작성할 수 있습니다.
4. **새 계약서**: 입력만 비웁니다(도장·명판·설정은 유지).

## 로컬 실행

Node.js 18 이상이 필요합니다.

```bash
npm install
```

```bash
npm run dev
```

터미널에 나오는 `Network:` 주소(예: `http://192.168.0.10:5173`)를 같은 Wi‑Fi의 휴대전화로 열면 바로 확인할 수 있습니다.
(공유 시트·서비스워커·홈 화면 추가는 HTTPS 또는 localhost에서만 동작하므로 실제 사용은 아래 배포 후에 하세요.)

금액 한글 변환 테스트:

```bash
npm test
```

## 빌드

```bash
npm run build
```

`dist/` 폴더가 결과물입니다. `npm run preview`로 빌드본을 확인할 수 있습니다.
`base: './'`로 빌드하므로 도메인 루트든 하위 경로든 그대로 올리면 됩니다.

## 정적 호스팅 배포 (HTTPS 필수)

### Netlify
- 가장 쉬운 방법: https://app.netlify.com/drop 에 `dist` 폴더를 끌어다 놓습니다.
- Git 연동 시: Build command `npm run build`, Publish directory `dist`.

### Vercel
- 새 프로젝트로 저장소를 가져오면 Vite가 자동 인식됩니다(Build `npm run build`, Output `dist`).
- 또는 CLI: `npx vercel --prod` (프로젝트 폴더에서).

### GitHub Pages
1. 저장소에 올린 뒤 Settings → Pages → Source를 **GitHub Actions**로 설정합니다.
2. `.github/workflows/pages.yml`을 만듭니다:

```yaml
name: Deploy
on: { push: { branches: [main] } }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: { name: github-pages }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci && npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
      - uses: actions/deploy-pages@v4
```

> 주의: 저장소가 공개(public)면 앱 코드가 공개됩니다. 앱에는 개인정보가 들어 있지 않지만(모든 입력은 기기에만 저장), 법인 계좌번호 등 상수문구는 코드에 포함됩니다.

## 휴대전화 홈 화면에 추가

- **iPhone (Safari)**: 배포 주소 열기 → 아래쪽 공유 버튼(□↑) → **홈 화면에 추가** → 추가.
  *Safari에서 추가해야 합니다(카카오톡 인앱 브라우저 X).*
- **Android (Chrome)**: 배포 주소 열기 → 오른쪽 위 ⋮ → **홈 화면에 추가** 또는 **앱 설치**.

홈 화면에서 한 번 열면 이후에는 오프라인에서도 열립니다.
iPhone은 홈 화면 앱과 Safari 탭의 저장공간이 **서로 다릅니다** — 도장은 실제로 쓸 쪽(홈 화면 앱)에서 올리세요.

## 데이터 보관에 대해

- 입력 중인 내용은 자동 보관되어 앱을 닫았다 열어도 남아 있습니다.
- 브라우저 데이터 삭제, 앱 삭제 시 도장·이력도 함께 지워집니다. 도장 원본 PNG는 따로 보관하세요.
- 이력은 최근 300건까지 보관합니다.

## 설정 (도장 · 명판 관리 아래)

- **명판 폭**: 40~85mm (기본 55mm — 샘플 완성본 비율 기준. 지시서의 80mm는 행정사 정보 글자와 겹쳐서 조절 가능하게 둠)
- **계약서 글꼴**: 내장 Noto Sans KR(기본, 기기마다 줄바꿈 동일) / 시스템 글꼴(맑은 고딕·Apple SD 고딕)
- **JPG 배율**: 2배 / 2.5배(기본). JPEG 품질 0.92.

## 프로젝트 구조

```
src/
  App.jsx                    화면 흐름, 저장/이력/새 계약서, 페이지 넘침 자동 맞춤
  main.jsx, styles.css       진입점, 앱 UI + A4 계약서 스타일(mm/pt 실측)
  lib/
    koreanMoney.js           만원 → "이백만원(2,000,000원)" (억 단위, 일백/일십 생략)
    storage.js               localStorage(초안·설정·이력) / IndexedDB(도장)
    imageTools.js            도장 업로드 처리(흰 배경 투명화, 여백 자르기)
    exportJpg.js             html2canvas → JPEG, 공유 시트 / 다운로드
  components/
    Preview.jsx              A4 실제 크기를 화면 폭에 맞춰 축소
    Stamps.jsx               직인·간인·명판(이미지 / 텍스트 대체) 배치
    StampManager.jsx         도장 업로드 UI + 설정
    HistorySheet.jsx         작성 이력
    ExportDialog.jsx         JPG 결과 · 공유
  templates/
    index.js                 템플릿 레지스트리
    f6/constants.js          표준 상수문구, 대행내용 항목 후보, 부가 문구, 시점·제외항목 목록, 계좌
    f6/model.js              데이터 모델, 금액 계산, 검증
    f6/F6Form.jsx            입력 폼
    f6/F6Pages.jsx           A4 2쪽 레이아웃
tests/                     금액 변환·데이터 모델 테스트
```

## 확장을 위한 구조 (아직 구현하지 않음)

- **다른 체류자격 템플릿**: `src/templates/<id>/`에 Form·Pages·model을 만들고 `templates/index.js`의 `TEMPLATES`에 등록합니다. 이력·초안은 `templateId`를 함께 저장합니다.
- **전자서명**: 데이터 모델에 `signature` 필드가 자리 잡혀 있습니다. 서명 이미지를 받아 `F6Pages`의 의뢰인 `(인)` 자리에 `SealOn`처럼 겹쳐 그리면 됩니다. 링크로 의뢰인에게 여는 기능은 서버(또는 공유 저장소)가 필요합니다.
- **이력 클라우드 동기화(Google Drive)**: `lib/storage.js`의 `historyStore`(list/add/remove)와 같은 인터페이스의 어댑터를 만들어 교체하거나 감싸면 됩니다.
