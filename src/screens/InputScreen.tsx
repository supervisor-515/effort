import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { useStatsView } from '../statsView';
import { entryEffort, entryHours, joyPart } from '../lib/score';
import {
  addDays, currentBand, entryBand, fmtHM, fullDateLabel, parseISODate, relDateLabel, resWord, TIME_BANDS, toISODate, f1,
} from '../lib/format';
import { streaks } from '../lib/stats';
import { Lozenge, btnPrimary, btnDefault } from '../components/ui';
import type { Category, Entry, Resistance } from '../types';

type Draft = { text: string; units: number; resistance: Resistance; catId: string; band: number };
const PRESETS: { label: string; units: number }[] = [
  { label: '15분', units: 1 }, { label: '30분', units: 2 }, { label: '1시간', units: 4 }, { label: '2시간', units: 8 },
];

export function InputScreen({ initialDate }: { initialDate?: string }) {
  const { entries, categories, addEntry, updateEntry, removeEntry, restoreEntry, settings } = useStore();
  const coef = settings.resistanceCoef;
  const { today } = useStatsView();

  // 달력 등에서 특정 날짜로 진입하면 그 날짜를 연다
  const initOffset = useMemo(() => {
    if (!initialDate) return 0;
    const diff = Math.round((today.getTime() - parseISODate(initialDate).getTime()) / 86400000);
    return Math.max(0, diff);
  }, [initialDate, today]);
  const [offset, setOffset] = useState(initOffset);
  useEffect(() => { setOffset(initOffset); }, [initOffset]);
  const [composerOpen, setComposerOpen] = useState(true);
  const [draft, setDraft] = useState<Draft>(() => ({ text: '', units: 4, resistance: 2, catId: categories[0]?.id ?? 'study', band: currentBand() }));
  const [popKey, setPopKey] = useState(0);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [undo, setUndo] = useState<Entry | null>(null);
  const undoTimer = useRef<number | undefined>(undefined);
  const scrRef = useRef<HTMLDivElement>(null);

  // 컴포저 핸들 드래그 + 탭 토글
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
    const d = dragRef.current; if (!d) return;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 6) d.moved = true;
    setDragDy(composerOpen ? Math.max(0, Math.min(dy, 240)) : Math.min(0, Math.max(dy, -90)));
  };
  const onHandleUp = (e: React.PointerEvent) => {
    const d = dragRef.current; if (!d) return;
    const dy = e.clientY - d.startY;
    dragRef.current = null;
    setDragging(false);
    setDragDy(0);
    if (d.moved) {
      draggedRef.current = true;
      if (composerOpen && dy > 56) setComposerOpen(false);
      else if (!composerOpen && dy < -32) setComposerOpen(true);
    }
  };
  const onHandleClick = () => {
    if (draggedRef.current) { draggedRef.current = false; return; }
    setComposerOpen((o) => !o);
  };

  const selDate = addDays(today, -offset);
  const iso = toISODate(selDate);

  const dayItems = useMemo(() => entries.filter((e) => e.date === iso), [entries, iso]);
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const totalEffort = dayItems.reduce((a, e) => a + entryEffort(e, coef), 0);
  const totalHours = dayItems.reduce((a, e) => a + entryHours(e), 0);
  const joy = dayItems.reduce((a, e) => a + joyPart(e, coef), 0);
  const goal = settings.dailyGoal;
  const goalMet = goal > 0 && totalEffort >= goal;
  const fill = goal > 0 ? Math.min(totalEffort / goal, 1) : (totalEffort > 0 ? 1 : 0);
  const split = totalEffort > 0 ? joy / totalEffort : 0;
  const joyW = fill * split * 100;
  const clayW = fill * (1 - split) * 100;

  const streak = streaks(entries, today).current;
  const canAdd = draft.text.trim().length > 0;
  const ensureCat = catMap.has(draft.catId) ? draft.catId : categories[0]?.id ?? 'study';

  const submit = () => {
    if (!draft.text.trim()) return;
    addEntry({ date: iso, text: draft.text.trim(), units: draft.units, resistance: draft.resistance, categoryId: ensureCat, band: draft.band });
    setDraft((d) => ({ ...d, text: '', resistance: 2 }));
    setPopKey((k) => k + 1);
    setTimeout(() => { const el = scrRef.current; if (el) el.scrollTop = el.scrollHeight; }, 80);
  };

  const doDelete = (entry: Entry) => {
    removeEntry(entry.id);
    setEditing(null);
    setUndo(entry);
    window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setUndo(null), 5000);
  };
  const doUndo = () => {
    if (undo) restoreEntry(undo);
    setUndo(null);
    window.clearTimeout(undoTimer.current);
  };

  const saveEdit = (d: Draft) => {
    if (!editing) return;
    updateEntry(editing.id, { text: d.text.trim() || editing.text, units: d.units, resistance: d.resistance, categoryId: d.catId, band: d.band });
    setEditing(null);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* 날짜 네비 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px 14px', flex: 'none' }}>
        <button onClick={() => setOffset((o) => o + 1)} aria-label="이전 날" style={navBtn}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ font: '600 16px var(--font-sans)', color: 'var(--ink)' }}>{relDateLabel(offset)}</div>
          <div style={{ font: '400 12px var(--font-sans)', color: 'var(--ink-mute)', marginTop: 1 }}>{fullDateLabel(selDate)}</div>
        </div>
        <button onClick={() => setOffset((o) => Math.max(0, o - 1))} aria-label="다음 날" disabled={offset === 0} style={{ ...navBtn, opacity: offset > 0 ? 1 : 0.28 }}>›</button>
      </div>

      <div ref={scrRef} className="scr" onClick={() => composerOpen && setComposerOpen(false)}
        style={{ flex: 1, padding: `0 18px ${composerOpen ? 360 : 150}px`, transition: 'padding .3s ease' }}>
        {/* 누적 카드 */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)', padding: 20, boxShadow: 'var(--shadow-raised)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ font: '500 13px var(--font-sans)', color: 'var(--ink-soft)' }}>{offset === 0 ? '오늘의 노력' : '그날의 노력'}</span>
            {streak > 0 && <Lozenge tone="clay" dot>연속 {streak}일</Lozenge>}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', margin: '10px 0 18px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, color: 'var(--ink)', font: '600 60px var(--font-serif)', lineHeight: 0.9 }}>
              <span key={popKey} style={{ display: 'inline-block', animation: 'pop .55s cubic-bezier(.2,.85,.3,1.25)' }}>{f1(totalEffort)}</span>
              <span style={{ font: '400 16px var(--font-sans)', color: 'var(--ink-mute)' }}>점</span>
            </div>
            <div style={{ display: 'flex', gap: 18, textAlign: 'right' }}>
              <div>
                <div style={{ font: '600 20px var(--font-serif)', color: 'var(--ink)' }}>{fmtHM(totalHours)}</div>
                <div style={{ font: '400 11px var(--font-sans)', color: 'var(--ink-mute)', marginTop: 2 }}>투입 시간</div>
              </div>
              <div>
                <div style={{ font: '600 20px var(--font-serif)', color: 'var(--ink)' }}>{dayItems.length}<span style={{ font: '400 11px var(--font-sans)', color: 'var(--ink-mute)' }}>개</span></div>
                <div style={{ font: '400 11px var(--font-sans)', color: 'var(--ink-mute)', marginTop: 2 }}>항목</div>
              </div>
            </div>
          </div>
          <div style={{ height: 12, borderRadius: 'var(--r-pill)', background: 'var(--card-2)', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${joyW}%`, background: 'var(--olive)', transition: 'width .55s cubic-bezier(.2,.8,.3,1)' }} />
            <div style={{ width: `${clayW}%`, background: 'var(--clay)', transition: 'width .55s cubic-bezier(.2,.8,.3,1)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 11 }}>
            <Legend color="var(--olive)" label="즐겁게 한 노력" />
            <Legend color="var(--clay)" label="버텨낸 노력" />
            {goal > 0 && (
              <span style={{ marginLeft: 'auto', font: '500 11px var(--font-sans)', color: goalMet ? 'var(--olive-text)' : 'var(--ink-mute)' }}>
                {goalMet ? `✓ 목표 ${f1(goal)}점 달성` : `목표 ${f1(totalEffort)} / ${f1(goal)}점`}
              </span>
            )}
          </div>
        </div>

        <div style={{ font: '700 13px var(--font-sans)', color: 'var(--ink)', margin: '24px 4px 10px' }}>
          {offset === 0 ? '오늘 기록한 항목' : '그날 기록한 항목'}
        </div>

        {dayItems.length === 0 ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)', padding: '26px 18px', textAlign: 'center' }}>
            <div style={{ font: '400 13px/1.7 var(--font-sans)', color: 'var(--ink-mute)' }}>
              아직 비어 있어요.<br />아래에서 한 일을 한 줄 적어보세요.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dayItems.map((it) => {
              const cat = catMap.get(it.categoryId);
              const color = cat?.color ?? 'var(--olive)';
              return (
                <div key={it.id} onClick={(e) => { e.stopPropagation(); setEditing(it); }}
                  style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)', padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 13, animation: 'slideIn .35s ease', cursor: 'pointer', boxShadow: 'var(--shadow-raised)' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 'var(--r-card-sm)', background: 'var(--card-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    <span style={{ width: 11, height: 11, borderRadius: 4, background: color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: '500 15px var(--font-sans)', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.text}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 5, font: '400 12px var(--font-sans)', color: 'var(--ink-mute)' }}>
                      <span style={{ color, fontWeight: 600 }}>{cat?.name ?? '기타'}</span>
                      <span>·</span><span>{fmtHM(entryHours(it))}</span>
                      <span>·</span><span>{resWord(it.resistance)}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flex: 'none' }}>
                    <div style={{ font: '600 19px var(--font-serif)', color: 'var(--ink)' }}>{f1(entryEffort(it, coef))}</div>
                    <div style={{ font: '400 10px var(--font-sans)', color: 'var(--ink-mute)' }}>점</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); doDelete(it); }} aria-label="삭제" style={{ width: 28, height: 28, borderRadius: 'var(--r-ctl)', border: 'none', background: 'transparent', color: 'var(--ink-mute)', fontSize: 17, cursor: 'pointer', flex: 'none' }}>×</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 컴포저 시트 (추가) */}
      <div onClick={(e) => e.stopPropagation()}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 64, zIndex: 5, background: 'var(--card)', borderTop: '1px solid var(--line)', borderRadius: '16px 16px 0 0', padding: '6px 18px 16px', boxShadow: 'var(--shadow-overlay)', transform: dragDy ? `translateY(${dragDy}px)` : undefined, transition: dragging ? 'none' : 'transform .25s cubic-bezier(.2,.8,.3,1)' }}>
        <button onClick={onHandleClick} onPointerDown={onHandleDown} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleUp}
          aria-label="입력창 펼치기/접기 (탭 또는 드래그)"
          style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0 12px', touchAction: 'none' }}>
          <div style={{ width: 38, height: 4, borderRadius: 'var(--r-pill)', background: 'var(--border-bold)' }} />
        </button>

        {composerOpen && (
          <div style={{ animation: 'slideIn .25s ease' }}>
            <EntryForm value={draft} onChange={setDraft} categories={categories} ensureCatId={ensureCat} onEnter={submit} />
            <button onClick={submit} disabled={!canAdd}
              style={{ width: '100%', marginTop: 16, height: 50, borderRadius: 'var(--r-ctl)', border: 'none', background: canAdd ? 'var(--olive)' : 'var(--card-2)', color: canAdd ? '#fff' : 'var(--ink-mute)', font: '600 16px var(--font-sans)', cursor: canAdd ? 'pointer' : 'default', transition: 'background .2s' }}>
              ＋ 항목 추가하기
            </button>
          </div>
        )}
      </div>

      {/* 삭제 되돌리기 토스트 */}
      {undo && (
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 76, zIndex: 60, background: 'var(--ink)', color: 'var(--card)', borderRadius: 'var(--r-card-sm)', padding: '10px 12px 10px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-overlay)', animation: 'slideIn .3s ease', font: '400 13px var(--font-sans)' }}>
          <span style={{ flex: 1 }}>‘{undo.text}’ 삭제됨</span>
          <button onClick={doUndo} style={{ border: 'none', background: 'var(--olive)', color: '#fff', borderRadius: 'var(--r-ctl)', padding: '7px 12px', font: '600 13px var(--font-sans)', cursor: 'pointer' }}>되돌리기</button>
        </div>
      )}

      {/* 편집 모달 */}
      {editing && (
        <EditModal entry={editing} categories={categories} onClose={() => setEditing(null)} onSave={saveEdit} onDelete={() => doDelete(editing)} />
      )}
    </div>
  );
}

/** 추가/편집 공용 입력 폼 */
function EntryForm({ value, onChange, categories, ensureCatId, onEnter }: {
  value: Draft; onChange: (d: Draft) => void; categories: Category[]; ensureCatId: string; onEnter?: () => void;
}) {
  const set = (patch: Partial<Draft>) => onChange({ ...value, ...patch });
  return (
    <>
      {/* 시간 스테퍼 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => set({ units: Math.max(1, value.units - 1) })} aria-label="시간 줄이기" style={stepBtn}>−</button>
        <div style={{ flex: 1, textAlign: 'center', font: '600 22px var(--font-serif)', color: 'var(--ink)' }}>{fmtHM(value.units * 0.25)}</div>
        <button onClick={() => set({ units: Math.min(48, value.units + 1) })} aria-label="시간 늘리기" style={stepBtn}>＋</button>
      </div>
      {/* 빠른 시간 프리셋 */}
      <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
        {PRESETS.map((p) => {
          const on = value.units === p.units;
          return (
            <button key={p.label} onClick={() => set({ units: p.units })}
              style={{ flex: 1, padding: '8px 0', borderRadius: 'var(--r-ctl)', font: '500 13px var(--font-sans)', cursor: 'pointer', background: on ? 'var(--olive-subtle)' : 'var(--card-2)', color: on ? 'var(--olive-text)' : 'var(--ink-soft)', border: `1px solid ${on ? 'var(--olive-text)' : 'transparent'}` }}>
              {p.label}
            </button>
          );
        })}
      </div>

      {/* 저항도 */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 9 }}>
          <span style={{ font: '500 13px var(--font-sans)', color: 'var(--ink-soft)' }}>저항도</span>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <span style={{ font: '600 18px var(--font-serif)', color: 'var(--clay)' }}>{value.resistance}</span>
            <span style={{ font: '400 12px var(--font-sans)', color: 'var(--ink-mute)' }}>{resWord(value.resistance)}</span>
          </span>
        </div>
        <input type="range" className="res" min={0} max={5} step={1} value={value.resistance}
          aria-label="저항도" aria-valuetext={`${value.resistance} ${resWord(value.resistance)}`}
          onChange={(e) => set({ resistance: Number(e.target.value) as Resistance })} />
        <div style={{ display: 'flex', justifyContent: 'space-between', font: '400 10.5px var(--font-sans)', color: 'var(--ink-mute)', marginTop: 5 }}>
          <span>편하게 함</span><span>나를 이김</span>
        </div>
      </div>

      {/* 카테고리 */}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 16 }}>
        {categories.map((c) => {
          const sel = c.id === (categories.some((x) => x.id === value.catId) ? value.catId : ensureCatId);
          return (
            <button key={c.id} onClick={() => set({ catId: c.id })}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 'var(--r-pill)', font: '500 13px var(--font-sans)', cursor: 'pointer', transition: 'all .15s', background: sel ? 'var(--card)' : 'transparent', border: `1.5px solid ${sel ? c.color : 'var(--line)'}`, color: sel ? 'var(--ink)' : 'var(--ink-soft)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: c.color, opacity: sel ? 1 : 0.45 }} />
              {c.name}
            </button>
          );
        })}
      </div>

      {/* 시간대 */}
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        {TIME_BANDS.map((b, i) => {
          const on = value.band === i;
          return (
            <button key={b} onClick={() => set({ band: i })}
              style={{ flex: 1, padding: '7px 0', borderRadius: 'var(--r-ctl)', font: '500 12px var(--font-sans)', cursor: 'pointer', background: on ? 'var(--clay-subtle)' : 'var(--card-2)', color: on ? 'var(--clay-accent)' : 'var(--ink-soft)', border: `1px solid ${on ? 'var(--clay-accent)' : 'transparent'}` }}>
              {b}
            </button>
          );
        })}
      </div>

      <input value={value.text} onChange={(e) => set({ text: e.target.value })}
        onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter(); }} placeholder="무엇을 했나요?"
        style={{ width: '100%', marginTop: 18, border: 'none', background: 'transparent', font: '500 17px var(--font-sans)', color: 'var(--ink)', outline: 'none', padding: '0 2px 12px', borderBottom: '1.5px solid var(--line)' }} />
    </>
  );
}

function EditModal({ entry, categories, onClose, onSave, onDelete }: {
  entry: Entry; categories: Category[]; onClose: () => void; onSave: (d: Draft) => void; onDelete: () => void;
}) {
  const [d, setD] = useState<Draft>(() => ({
    text: entry.text, units: entry.units, resistance: entry.resistance,
    catId: entry.categoryId, band: entryBand(entry) ?? currentBand(),
  }));
  const ensure = categories.some((c) => c.id === d.catId) ? d.catId : categories[0]?.id ?? 'study';
  return (
    <div role="dialog" aria-label="기록 편집" style={{ position: 'absolute', inset: 0, zIndex: 200, background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 'none', padding: 'calc(env(safe-area-inset-top,0px) + 16px) 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)' }}>
        <div style={{ font: '700 18px var(--font-sans)', color: 'var(--ink)' }}>기록 편집</div>
        <button onClick={onClose} aria-label="닫기" style={navBtn}>×</button>
      </div>
      <div className="scr" style={{ flex: 1, padding: '16px 18px' }}>
        <EntryForm value={d} onChange={setD} categories={categories} ensureCatId={ensure} />
      </div>
      <div style={{ flex: 'none', display: 'flex', gap: 10, padding: '12px 18px calc(env(safe-area-inset-bottom,0px) + 16px)', borderTop: '1px solid var(--line)' }}>
        <button onClick={onDelete} style={{ ...btnDefault, height: 50, padding: '0 18px', color: 'var(--clay-accent)' }}>삭제</button>
        <button onClick={() => onSave({ ...d, catId: ensure })} style={{ ...btnPrimary, flex: 1, height: 50, fontSize: 16 }}>저장</button>
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
  width: 34, height: 34, borderRadius: 'var(--r-ctl)', border: '1px solid var(--line)',
  background: 'var(--card)', color: 'var(--ink-soft)', fontSize: 17, cursor: 'pointer', flex: 'none',
};
const stepBtn: React.CSSProperties = {
  width: 48, height: 44, borderRadius: 'var(--r-ctl)', border: '1px solid var(--line)',
  background: 'var(--card-2)', color: 'var(--ink-soft)', fontSize: 22, cursor: 'pointer', flex: 'none',
};
