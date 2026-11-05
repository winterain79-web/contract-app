import { useLayoutEffect, useRef, useState } from 'react';

const A4_W = 793.7; // 210mm @96dpi

/** 실제 크기 A4 페이지를 화면 폭에 맞춰 축소해 보여준다 */
export default function Preview({ children }) {
  const outer = useRef(null);
  const inner = useRef(null);
  const [scale, setScale] = useState(0.4);
  const [h, setH] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      if (!outer.current || !inner.current) return;
      const s = Math.min(1, outer.current.clientWidth / A4_W);
      setScale(s);
      setH(inner.current.offsetHeight * s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer.current);
    ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="preview" ref={outer} style={{ height: h }}>
      <div className="preview-inner" ref={inner} style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
