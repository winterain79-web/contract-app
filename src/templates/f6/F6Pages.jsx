import { formatMan } from '../../lib/koreanMoney.js';
import { ACCOUNTS, FIRM, TEXT, dutyLines, kindOf } from './constants.js';
import { amounts, dateParts, excludeText } from './model.js';
import { Ganin, Nameplate, SealOn } from '../../components/Stamps.jsx';

const U = ({ children }) => <span className="u">{children}</span>;
const B = ({ children }) => <b>{children}</b>;
const BLANK = '　　　';

/**
 * A4 2쪽 계약서. pageRef(i, el)로 각 페이지 DOM을 넘겨 JPG 변환에 쓴다.
 * 모든 치수는 mm/pt — 실제 A4 비율 그대로 렌더링된다.
 */
export default function F6Pages({ data, stamps, settings, lineHeight = 2, pageRef }) {
  const kind = kindOf(data.applyType);
  const nat = data.nationality.trim() || BLANK;
  const a = amounts(data);
  const money = (n) => (n === null || n === undefined ? BLANK : formatMan(n));
  const lines = dutyLines(data.duties);
  const excl = excludeText(data);
  const dp = dateParts(data.contractDate);
  const y = dp ? dp.y : '　　';
  const m = dp ? dp.m : '　';
  const d = dp ? dp.d : '　';
  const when = (s) => (s || '').trim() || BLANK;
  const style = { lineHeight };
  const cls = `a4 ${settings.fontMode === 'system' ? 'font-system' : 'font-embedded'}`;

  return (
    <>
      {/* ───── 1쪽 ───── */}
      <div className={cls} ref={(el) => pageRef?.(0, el)}>
        <Ganin stamp={stamps.ganin || stamps.seal} page={1} />
        <div className="a4-inner" style={style}>
          <h1 className="c-title">
            <span>
              {TEXT.title.slice(0, -1)}
              <span className="last">{TEXT.title.slice(-1)}</span>
            </span>
          </h1>
          <div className="c-firm">{FIRM.name}</div>

          <section className="art">
            <div className="art-title">{TEXT.art1Title}</div>
            <p className="ind">{TEXT.art1}</p>
          </section>
          <section className="art">
            <div className="art-title">{TEXT.art2Title}</div>
            <p className="ind">{TEXT.art2}</p>
          </section>
          <section className="art">
            <div className="art-title">{TEXT.art3Title}</div>
            <p className="ind">{TEXT.art3(kind)}</p>
          </section>
          <section className="art">
            <div className="art-title">{TEXT.art4Title}</div>
            <p>
              {TEXT.art4Lead}
              <U>{TEXT.art4Body(nat, kind)}</U>
            </p>
            {lines.map((l, i) => (
              <p key={i} className="item">
                <U>({i + 1}) {l}</U>
              </p>
            ))}
          </section>
          <section className="art">
            <div className="art-title">{TEXT.art5Title}</div>
            <p className="ind">
              사무 대행의 비용은 총 <U>{money(a.total)}</U>으로 한다.
            </p>
            <p className="item">
              <B>(1) 착수금</B> : 의뢰인은 행정사가 <U>업무 착수 시 {money(a.deposit)}</U>을 지급한다.
            </p>
            <p className="item">
              <B>(2) 잔 금</B> : 의뢰인은{' '}
              {data.payMode === 'twice' ? (
                <>
                  <U>{when(data.midWhen)} 중도금 {money(a.mid)}</U>을 지급하고,{' '}
                  <U>{when(data.balWhen)} 잔금 {money(a.bal)}</U>을 지급한다.
                </>
              ) : (
                <>
                  <U>{when(data.balWhen)} 잔금 {money(a.bal)}</U>을 지급한다.
                </>
              )}
            </p>
            {excl !== null && (
              <p className="item">
                <B>(3) 대행비용에 포함되지 않는 사항</B> : <U>{excl || BLANK}</U>
              </p>
            )}
          </section>
          <div className="account-box">{(ACCOUNTS[data.account] || ACCOUNTS.corp).text}</div>
        </div>
      </div>

      {/* ───── 2쪽 ───── */}
      <div className={cls} ref={(el) => pageRef?.(1, el)}>
        <Ganin stamp={stamps.ganin || stamps.seal} page={2} />
        <div className="a4-inner" style={style}>
          <section className="art art-first">
            <div className="art-title">{TEXT.art6Title}</div>
            <p className="ind">{TEXT.art6}</p>
          </section>
          <section className="art">
            <div className="art-title">{TEXT.art7Title}</div>
            <p className="item">{TEXT.art7_1}</p>
            <p className="item">
              (2) <U>착수금 지급기한은 {y}년 {m}월 {d}일</U>
              {TEXT.art7_2tail}
            </p>
            <p className="item">
              (3) <U>{TEXT.art7_3}</U>
            </p>
          </section>
          <p className="closing">{TEXT.closing}</p>
          <p className="c-date">
            {y}년&nbsp;&nbsp;&nbsp;{m}월&nbsp;&nbsp;&nbsp;{d}일
          </p>

          <div className="party">
            <p>
              의뢰인 : {data.clientName.trim() || BLANK} (인)
            </p>
            <p>주민등록번호 : {data.rrn.trim()}</p>
            <p>주소 : {data.address.trim()}</p>
            {data.phone.trim() && <p>연락처 : {data.phone.trim()}</p>}
          </div>

          <div className="party admin">
            <p>
              행정사 : {FIRM.name} 대표 {FIRM.ceo} <SealOn stamp={stamps.seal}>(인)</SealOn>
            </p>
            <p>사업자등록번호 : {FIRM.bizNo}</p>
            <p>본점 주소 : {FIRM.hq}</p>
            {FIRM.branches.map(([k, v]) => (
              <p key={k}>
                {k} : {v}
              </p>
            ))}
            <p>연락처 : {FIRM.contact}</p>
            <Nameplate stamp={stamps.nameplate} seal={stamps.seal} widthMm={settings.nameplateWidth} />
          </div>
        </div>
      </div>
    </>
  );
}
