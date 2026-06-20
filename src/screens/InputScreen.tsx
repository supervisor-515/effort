import { useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { entryEffort, entryHours } from '../lib/score';
import {
  addDays, fmtHM, fullDateLabel, relDateLabel, resWord, toISODate, f1,
} from '../lib/format';
import { streaks } from '../lib/stats';
import type { Resistance } from '../types';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export function InputScreen() {
  const { entries, categories, settings, addEntry, removeEntry } = useStore();
  const coef = settings.resistanceCoef;

  const [offset, setOffset] = useState(0);
  const [composerOpen, setComposerOpen] = useState(true);
  const [text, setText] = useState('');
  const [units, setUnits] = useState(4);
  const [resistance, setResistance] = useState<Resistance>(2);
  const [catId, setCatId] = useState(categories[0]?.id ?? 'study');
  const [popKey, setPopKey] = useState(0);
  const scrRef = useRef<HTMLDivElement>(null);

  // 컴포저 핸들 드래그(잡고 내리기/올리기) + 탭 토글
  const [dragDy, setDragDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startY: number; moved: boolean } | null>(null);
  const draggedRef = useRef(false);

  const onHandleDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, moved: false };
    setDragging(true);
  };
  const onHandleMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 6) d.moved = true;
    // 열려 있으면 아래로, 접혀 있으면 위로 끌리는 만큼만 따라오게(살짝의 저항감)
    setDragDy(composerOpen ? Math.max(0, Math.min(dy, 240)) : Math.min(0, Math.max(dy, -90)));
  };
  const onHandleUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    dragRef.current = null;
    setDragging(false);
    setDragDy(0);
    if (d.moved) {
      draggedRef.current = true; // 뒤따라오는 click 억제
      if (composerOpen && dy > 56) setComposerOpen(false);
      else if (!composerOpen && dy < -32) setComposerOpen(true);
    }
  };
  const onHandleClick = () => {
    if (draggedRef.current) { draggedRef.current = false; return; }
    setComposerOpen((o) => !o);
  };

  const today = startOfToday();
  const selDate = addDays(today, -offset);
  const iso = toISODate(selDate);

  const dayItems = useMemo(
    () => entries.filter((e) => e.date === iso),
    [entries, iso],
  );

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const totalEffort = dayItems.reduce((a, e) => a + entryEffort(e, coef), 0);
  const totalHours = dayItems.reduce((a, e) => a + entryHours(e), 0);
  const joy = dayItems.filter((e) => e.resistance <= 2).reduce((a, e) => a + entryEffort(e, coef), 0);
  const goal = 10;
  const fill = Math.min(totalEffort / goal, 1);
  const split = totalEffort > 0 ? joy / totalEffort : 0;
  const joyW = fill * split * 100;
  const clayW = fill * (1 - split) * 100;

  const streak = streaks(entries, today).current;
  const canAdd = text.trim().length > 0;
  const ensureCat = catMap.has(catId) ? catId : categories[0]?.id ?? 'study';

  const submit = () => {
    if (!text.trim()) return;
    addEntry({ date: iso, text: text.trim(), units, resistance, categoryId: ensureCat });
    setText('');
    setResistance(2);
    setPopKey((k) => k + 1);
    setTimeout(() => {
      const el = scrRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 80);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* 날짜 네비 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 22px 12px', flex: 'none' }}>
        <button onClick={() => setOffset((o) => o + 1)} aria-label="이전 날" style={navBtn}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ font: '600 16px var(--font-sans)', color: 'var(--ink)' }}>{relDateLabel(offset)}</div>
          <div style={{ font: '400 12px var(--font-sans)', color: 'var(--ink-mute)', marginTop: 1 }}>{fullDateLabel(selDate)}</div>
        </div>
        <button
          onClick={() => setOffset((o) => Math.max(0, o - 1))}
          aria-label="다음 날"
          disabled={offset === 0}
          style={{ ...navBtn, opacity: offset > 0 ? 1 : 0.28 }}
        >
          ›
        </button>
      </div>

      <div
        ref={scrRef}
        className="scr"
        onClick={() => composerOpen && setComposerOpen(false)}
        style={{ flex: 1, padding: `0 18px ${composerOpen ? 320 : 150}px`, transition: 'padding .3s ease' }}
      >
        {/* 누적 카드 */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 22, padding: 20, boxShadow: '0 4px 16px rgba(90,70,35,.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ font: '500 13px var(--font-sans)', color: '#8B8270' }}>{offset === 0 ? '오늘의 노력' : '그날의 노력'}</span>
            {streak > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--card-2)', borderRadius: 99, padding: '5px 11px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--clay)' }} />
                <span style={{ font: '500 12px var(--font-sans)', color: 'var(--clay-accent)' }}>연속 {streak}일</span>
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', margin: '10px 0 18px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, color: 'var(--ink)', font: '500 60px var(--font-serif)', lineHeight: 0.9 }}>
              <span key={popKey} style={{ display: 'inline-block', animation: 'pop .55s cubic-bezier(.2,.85,.3,1.25)' }}>{f1(totalEffort)}</span>
              <span style={{ font: '400 16px var(--font-sans)', color: 'var(--ink-mute)' }}>점</span>
            </div>
            <div style={{ display: 'flex', gap: 18, textAlign: 'right' }}>
              <div>
                <div style={{ font: '500 20px var(--font-serif)', color: 'var(--ink)' }}>{fmtHM(totalHours)}</div>
                <div style={{ font: '400 11px var(--font-sans)', color: 'var(--ink-mute)', marginTop: 2 }}>투입 시간</div>
              </div>
              <div>
                <div style={{ font: '500 20px var(--font-serif)', color: 'var(--ink)' }}>{dayItems.length}<span style={{ font: '400 11px var(--font-sans)', color: 'var(--ink-mute)' }}>개</span></div>
                <div style={{ font: '400 11px var(--font-sans)', color: 'var(--ink-mute)', marginTop: 2 }}>항목</div>
              </div>
            </div>
          </div>
          <div style={{ height: 13, borderRadius: 99, background: '#ECE4D4', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${joyW}%`, background: 'var(--olive)', transition: 'width .55s cubic-bezier(.2,.8,.3,1)' }} />
            <div style={{ width: `${clayW}%`, background: 'var(--clay)', transition: 'width .55s cubic-bezier(.2,.8,.3,1)' }} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 11 }}>
            <Legend color="var(--olive)" label="즐겁게 한 노력" />
            <Legend color="var(--clay)" label="버텨낸 노력" />
          </div>
        </div>

        <div style={{ font: '600 12px var(--font-sans)', letterSpacing: '.04em', color: 'var(--ink-mute)', margin: '24px 6px 12px' }}>
          {offset === 0 ? '오늘 기록한 항목' : '그날 기록한 항목'}
        </div>

        {dayItems.length === 0 ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--line-2)', borderRadius: 16, padding: '26px 18px', textAlign: 'center' }}>
            <div style={{ font: '400 13px/1.7 var(--font-sans)', color: 'var(--ink-mute)' }}>
              아직 비어 있어요.<br />아래에서 오늘 한 일을 한 줄 적어보세요.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dayItems.map((it) => {
              const cat = catMap.get(it.categoryId);
              const color = cat?.color ?? 'var(--olive)';
              return (
                <div key={it.id} style={{ background: 'var(--card)', border: '1px solid var(--line-2)', borderRadius: 16, padding: '14px 15px', display: 'flex', alignItems: 'center', gap: 13, animation: 'slideIn .35s ease' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--card-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    <span style={{ width: 11, height: 11, borderRadius: 4, background: color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: '500 15px var(--font-sans)', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.text}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 5, font: '400 12px var(--font-sans)', color: '#9A917F' }}>
                      <span style={{ color, fontWeight: 500 }}>{cat?.name ?? '기타'}</span>
                      <span>·</span><span>{fmtHM(entryHours(it))}</span>
                      <span>·</span><span>{resWord(it.resistance)}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flex: 'none' }}>
                    <div style={{ font: '500 19px var(--font-serif)', color: 'var(--ink)' }}>{f1(entryEffort(it, coef))}</div>
                    <div style={{ font: '400 10px var(--font-sans)', color: '#B4AB98' }}>점</div>
                  </div>
                  <button onClick={() => removeEntry(it.id)} aria-label="삭제" style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'transparent', color: '#C3B9A4', fontSize: 16, cursor: 'pointer', flex: 'none' }}>×</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 컴포저 시트 */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 64, zIndex: 5, background: 'var(--card)', borderTop: '1px solid #E8E0D0', borderRadius: '24px 24px 0 0', padding: '10px 18px 16px', boxShadow: '0 -8px 28px rgba(80,60,30,.1)', transform: dragDy ? `translateY(${dragDy}px)` : undefined, transition: dragging ? 'none' : 'transform .25s cubic-bezier(.2,.8,.3,1)' }}
      >
        <button
          onClick={onHandleClick}
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
          aria-label="입력창 펼치기/접기 (탭 또는 드래그)"
          style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0 14px', touchAction: 'none' }}
        >
          <div style={{ width: 38, height: 4, borderRadius: 99, background: '#E0D8C8' }} />
        </button>

        {composerOpen && (
          <div style={{ animation: 'slideIn .25s ease' }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder="무엇을 했나요?"
              style={{ width: '100%', border: 'none', background: 'transparent', font: '500 17px var(--font-sans)', color: 'var(--ink)', outline: 'none', padding: '0 2px 12px', borderBottom: '1.5px solid var(--line-2)' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
              <button onClick={() => setUnits((u) => Math.max(1, u - 1))} aria-label="시간 줄이기" style={stepBtn}>−</button>
              <div style={{ flex: 1, textAlign: 'center', font: '500 22px var(--font-serif)', color: 'var(--ink)' }}>{fmtHM(units * 0.25)}</div>
              <button onClick={() => setUnits((u) => Math.min(48, u + 1))} aria-label="시간 늘리기" style={stepBtn}>＋</button>
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 9 }}>
                <span style={{ font: '500 13px var(--font-sans)', color: '#8B8270' }}>저항도</span>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                  <span style={{ font: '500 18px var(--font-serif)', color: 'var(--clay)' }}>{resistance}</span>
                  <span style={{ font: '400 12px var(--font-sans)', color: '#9A917F' }}>{resWord(resistance)}</span>
                </span>
              </div>
              <input type="range" className="res" min={0} max={5} step={1} value={resistance} onChange={(e) => setResistance(Number(e.target.value) as Resistance)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', font: '400 10.5px var(--font-sans)', color: '#B4AB98', marginTop: 5 }}>
                <span>편하게 함</span><span>나를 이김</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 16, alignItems: 'center' }}>
              {categories.map((c) => {
                const sel = c.id === ensureCat;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCatId(c.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 99, font: '500 13px var(--font-sans)', cursor: 'pointer', transition: 'all .15s', background: sel ? 'var(--card)' : 'transparent', border: `1.5px solid ${sel ? c.color : '#E2DACB'}`, color: sel ? 'var(--ink)' : '#8B8270' }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: 3, background: c.color, opacity: sel ? 1 : 0.45 }} />
                    {c.name}
                  </button>
                );
              })}
            </div>

            <button
              onClick={submit}
              disabled={!canAdd}
              style={{ width: '100%', marginTop: 18, height: 52, borderRadius: 15, border: 'none', background: canAdd ? 'var(--olive)' : '#E4DDCD', color: canAdd ? 'var(--card)' : '#A89E8B', font: '600 16px var(--font-sans)', cursor: canAdd ? 'pointer' : 'default', transition: 'all .2s' }}
            >
              ＋ 항목 추가하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, font: '400 12px var(--font-sans)', color: 'var(--ink-soft)' }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: color }} />
      {label}
    </span>
  );
}

const navBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: '50%', border: '1px solid #E4DCCB',
  background: 'var(--card)', color: 'var(--ink-soft)', fontSize: 16, cursor: 'pointer',
};
const stepBtn: React.CSSProperties = {
  width: 44, height: 44, borderRadius: 13, border: '1px solid #E4DCCB',
  background: 'var(--surface)', color: 'var(--ink-soft)', fontSize: 22, cursor: 'pointer', flex: 'none',
};
