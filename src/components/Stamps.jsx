import { FIRM } from '../templates/f6/constants.js';

export const SEAL_MM = 25;

/** 텍스트 위에 직인을 겹쳐 찍는다 (예: "(인)") */
export function SealOn({ stamp, children }) {
  return (
    <span className="seal-anchor">
      {children}
      {stamp && <StampImg stamp={stamp} sizeMm={SEAL_MM} className="seal-on" />}
    </span>
  );
}

/** 높이/너비 중 긴 쪽을 sizeMm에 맞춘 이미지 (html2canvas는 object-fit을 지원하지 않아 직접 계산) */
export function StampImg({ stamp, sizeMm, className, style }) {
  const { w = 1, h = 1 } = stamp;
  const r = w / h;
  const wMm = r >= 1 ? sizeMm : sizeMm * r;
  const hMm = r >= 1 ? sizeMm / r : sizeMm;
  return (
    <img
      src={stamp.src}
      alt=""
      className={`stamp ${className || ''}`}
      style={{
        width: `${wMm}mm`,
        height: `${hMm}mm`,
        marginLeft: `${-wMm / 2}mm`,
        marginTop: `${-hMm / 2}mm`,
        ...style,
      }}
    />
  );
}

/**
 * 간인: 페이지 왼쪽 가장자리, 상단에서 약 45% 지점.
 * - 온전한 원형 도장: 1쪽은 오른쪽 절반, 2쪽은 왼쪽 절반만 보이게 자른다.
 * - 이미 반쪽으로 잘린 간인 이미지(가로/세로 < 0.8): 그대로 양쪽 페이지에 찍는다.
 */
export function Ganin({ stamp, page }) {
  if (!stamp) return null;
  const { w = 1, h = 1 } = stamp;
  const preCut = w / h < 0.8;
  const H = SEAL_MM;
  if (preCut) {
    const W = H * (w / h);
    return (
      <div className="ganin" style={{ width: `${W}mm`, height: `${H}mm` }}>
        <img src={stamp.src} alt="" className="stamp" style={{ position: 'absolute', left: 0, top: 0, width: `${W}mm`, height: `${H}mm` }} />
      </div>
    );
  }
  const W = H * (w / h);
  return (
    <div className="ganin" style={{ width: `${W / 2}mm`, height: `${H}mm` }}>
      <img
        src={stamp.src}
        alt=""
        className="stamp"
        style={{ position: 'absolute', top: 0, left: page === 1 ? `${-W / 2}mm` : 0, width: `${W}mm`, height: `${H}mm` }}
      />
    </div>
  );
}

/** 명판: 행정사 정보 오른쪽. 이미지가 없으면 파란 글씨로 렌더링. 오른쪽 끝에 직인을 한 번 더 찍는다. */
export function Nameplate({ stamp, seal, widthMm = 55 }) {
  const W = widthMm;
  const body = stamp ? (
    <img
      src={stamp.src}
      alt=""
      className="stamp"
      style={{ display: 'block', width: `${W}mm`, height: `${W * (stamp.h / stamp.w)}mm` }}
    />
  ) : (
    <TextNameplate widthMm={W} />
  );
  return (
    <div className="nameplate" style={{ width: `${W}mm` }}>
      {body}
      {seal && (
        <StampImg
          stamp={seal}
          sizeMm={SEAL_MM}
          className="seal-np"
          style={{ position: 'absolute', left: `${W - 4}mm`, top: `${W * 0.12}mm` }}
        />
      )}
    </div>
  );
}

function TextNameplate({ widthMm: W }) {
  const f = (k) => `${(W * k).toFixed(2)}mm`;
  return (
    <div className="np-text" style={{ width: `${W}mm`, padding: `${f(0.02)} 0` }}>
      <div style={{ fontSize: f(0.118), letterSpacing: f(0.004), lineHeight: 1.15 }}>{FIRM.bizNo}</div>
      <div className="np-row" style={{ fontSize: f(0.058), marginTop: f(0.02) }}>
        <span>{FIRM.name}</span>
        <span style={{ fontSize: f(0.075) }}>정 남 원</span>
      </div>
      <div style={{ fontSize: f(0.062), marginTop: f(0.03) }}>{FIRM.hq}</div>
      <div className="np-row" style={{ fontSize: f(0.055), marginTop: f(0.03), alignItems: 'center' }}>
        <span>{FIRM.bizType}</span>
        <span style={{ textAlign: 'center', lineHeight: 1.15 }}>
          기타 법무관련
          <br />
          서 비 스 업
        </span>
      </div>
    </div>
  );
}
