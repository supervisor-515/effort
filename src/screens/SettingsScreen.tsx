import { useRef, useState } from 'react';
import { useStore } from '../store';
import { CATEGORY_PALETTE } from '../lib/demo';
import { Card, ScreenHeader, SectionLabel, btnPrimary, btnDefault } from '../components/ui';
import type { ThemePref } from '../types';

const COLOR_OPTIONS = Array.from(new Set([
  '#6F7252', '#C07B53', '#5E7184', '#A98B6A', '#9B6B8E', '#8A9B6B', '#7FA0A0', ...CATEGORY_PALETTE,
]));

const THEMES: { key: ThemePref; label: string }[] = [
  { key: 'auto', label: '자동' }, { key: 'light', label: '라이트' }, { key: 'dark', label: '다크' },
];

export function SettingsScreen({ onOpenGuide }: { onOpenGuide: () => void }) {
  const {
    categories, settings, demoMode,
    addCategory, updateCategory, moveCategory, removeCategory, categoryEntryCount,
    updateSettings, setDemoMode, exportData, importData,
  } = useStore();
  const [newCat, setNewCat] = useState('');
  const [colorEditId, setColorEditId] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<{ id: string; count: number; reassignTo: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const coef = settings.resistanceCoef;

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2400); };

  const ex = (r: number) => 1 * (1 + r * coef);
  const exMax = ex(5);
  const exW = (r: number) => ((ex(r) / exMax) * 100).toFixed(0);

  const onAddCat = () => { addCategory(newCat); setNewCat(''); };

  const onDeleteCat = (id: string) => {
    const count = categoryEntryCount(id);
    if (count === 0) { removeCategory(id); return; }
    const other = categories.find((c) => c.id !== id);
    setConfirmDel({ id, count, reassignTo: other?.id ?? '' });
  };

  const onExport = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `노력기록-백업-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash('백업 파일을 내보냈어요.');
  };

  const onImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const res = importData(JSON.parse(text));
      flash(res.ok ? '백업을 불러왔어요.' : res.error ?? '불러오기에 실패했어요.');
    } catch {
      flash('파일을 읽지 못했어요.');
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <ScreenHeader title="설정" sub="기록의 규칙을 내게 맞춰요" />
      <div className="scr" style={{ flex: 1, padding: '0 18px 24px' }}>
        {/* 사용 안내 */}
        <SectionLabel style={{ margin: '6px 4px 10px' }}>도움말</SectionLabel>
        <Card style={{ padding: 0 }}>
          <button onClick={onOpenGuide} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ width: 32, height: 32, borderRadius: 'var(--r-card-sm)', background: 'var(--card-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', font: '700 16px var(--font-sans)', color: 'var(--olive-text)' }}>?</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', font: '500 15px var(--font-sans)', color: 'var(--ink)' }}>사용 안내</span>
              <span style={{ display: 'block', font: '400 12px var(--font-sans)', color: 'var(--ink-mute)', marginTop: 2 }}>앱 사용법을 처음부터 다시 보기</span>
            </span>
            <span style={{ color: 'var(--ink-mute)', font: '400 18px var(--font-sans)', flex: 'none' }}>›</span>
          </button>
        </Card>

        {/* 저항 계수 */}
        <SectionLabel>노력 계산</SectionLabel>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ font: '500 14px var(--font-sans)', color: 'var(--ink)' }}>저항 계수</span>
            <span style={{ font: '600 24px var(--font-serif)', color: 'var(--clay)' }}>{coef.toFixed(2)}</span>
          </div>
          <div style={{ font: '400 12px/1.5 var(--font-sans)', color: 'var(--ink-soft)', margin: '6px 0 14px' }}>
            저항도가 노력 점수를 얼마나 키울지 정해요. 클수록 ‘버텨낸 노력’을 더 높게 칩니다.
          </div>
          <input type="range" className="res" min={0.1} max={0.5} step={0.05} value={coef}
            aria-label="저항 계수" aria-valuetext={coef.toFixed(2)}
            onChange={(e) => updateSettings({ resistanceCoef: Number(e.target.value) })} />
          <div style={{ display: 'flex', justifyContent: 'space-between', font: '400 10.5px var(--font-sans)', color: 'var(--ink-mute)', marginTop: 5 }}>
            <span>0.10 · 완만</span><span>0.50 · 가파름</span>
          </div>
          <div style={{ background: 'var(--card-2)', borderRadius: 'var(--r-card-sm)', padding: '13px 14px', marginTop: 16 }}>
            <div style={{ font: '400 11px var(--font-sans)', color: 'var(--ink-mute)', marginBottom: 10 }}>투입 1시간 기준 — 저항도별 노력 점수</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <ExRow label="저항 0" w={exW(0)} val={ex(0).toFixed(2)} barColor="var(--olive)" />
              <ExRow label="저항 3" w={exW(3)} val={ex(3).toFixed(2)} barColor="var(--clay)" />
              <ExRow label="저항 5" w={exW(5)} val={ex(5).toFixed(2)} barColor="var(--clay)" />
            </div>
          </div>
        </Card>

        {/* 카테고리 관리 */}
        <SectionLabel>카테고리 관리</SectionLabel>
        <Card style={{ padding: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {categories.map((c, i) => (
              <div key={c.id} style={{ borderBottom: '1px solid var(--line-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px' }}>
                  <button onClick={() => setColorEditId(colorEditId === c.id ? null : c.id)} aria-label="색 변경"
                    style={{ width: 22, height: 22, borderRadius: 6, background: c.color, border: '1px solid rgba(0,0,0,.08)', cursor: 'pointer', flex: 'none' }} />
                  <input value={c.name} onChange={(e) => updateCategory(c.id, { name: e.target.value })} aria-label="카테고리 이름"
                    style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', font: '500 15px var(--font-sans)', color: 'var(--ink)', outline: 'none' }} />
                  <button onClick={() => moveCategory(c.id, -1)} disabled={i === 0} aria-label="위로"
                    style={{ ...miniBtn, opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                  <button onClick={() => moveCategory(c.id, 1)} disabled={i === categories.length - 1} aria-label="아래로"
                    style={{ ...miniBtn, opacity: i === categories.length - 1 ? 0.3 : 1 }}>↓</button>
                  <button onClick={() => onDeleteCat(c.id)} aria-label="삭제" style={{ ...miniBtn, color: 'var(--clay-accent)' }}>×</button>
                </div>
                {colorEditId === c.id && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 8px 12px' }}>
                    {COLOR_OPTIONS.map((col) => (
                      <button key={col} onClick={() => { updateCategory(c.id, { color: col }); setColorEditId(null); }} aria-label={`색 ${col}`}
                        style={{ width: 24, height: 24, borderRadius: '50%', background: col, border: c.color === col ? '2.5px solid var(--ink)' : '1px solid rgba(0,0,0,.08)', cursor: 'pointer' }} />
                    ))}
                  </div>
                )}
                {confirmDel?.id === c.id && (
                  <div style={{ background: 'var(--card-2)', borderRadius: 'var(--r-card-sm)', padding: 12, margin: '0 4px 10px' }}>
                    <div style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--ink-soft)', marginBottom: 10 }}>
                      이 카테고리에 기록 <b style={{ color: 'var(--ink)' }}>{confirmDel.count}개</b>가 있어요. 어떻게 할까요?
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <select value={confirmDel.reassignTo} onChange={(e) => setConfirmDel({ ...confirmDel, reassignTo: e.target.value })}
                        style={{ flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 'var(--r-ctl)', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', font: '500 13px var(--font-sans)' }}>
                        {categories.filter((x) => x.id !== c.id).map((x) => <option key={x.id} value={x.id}>{x.name}(으)로 이동</option>)}
                      </select>
                      <button onClick={() => { removeCategory(confirmDel.id, confirmDel.reassignTo); setConfirmDel(null); flash('카테고리를 정리했어요.'); }}
                        disabled={!confirmDel.reassignTo} style={{ ...btnPrimary, padding: '8px 12px', opacity: confirmDel.reassignTo ? 1 : 0.4 }}>이동</button>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { removeCategory(confirmDel.id); setConfirmDel(null); flash('카테고리와 기록을 삭제했어요.'); }}
                        style={{ ...btnDefault, flex: 1, padding: '8px 0', color: 'var(--clay-accent)' }}>기록도 함께 삭제</button>
                      <button onClick={() => setConfirmDel(null)} style={{ ...btnDefault, flex: 1, padding: '8px 0' }}>취소</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 8px' }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, border: '1.5px dashed var(--border-bold)', flex: 'none' }} />
              <input value={newCat} onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') onAddCat(); }} placeholder="새 카테고리 이름" size={1}
                style={{ flex: '1 1 0%', minWidth: 0, border: 'none', background: 'transparent', font: '500 15px var(--font-sans)', color: 'var(--ink)', outline: 'none' }} />
              <button onClick={onAddCat} style={{ ...btnPrimary, padding: '8px 14px', flex: 'none', fontWeight: 600 }}>추가</button>
            </div>
          </div>
        </Card>

        {/* 화면 테마 */}
        <SectionLabel>화면</SectionLabel>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ font: '500 15px var(--font-sans)', color: 'var(--ink)' }}>테마</span>
          </div>
          <div style={{ display: 'flex', background: 'var(--card-2)', borderRadius: 'var(--r-ctl)', padding: 4, gap: 3 }}>
            {THEMES.map((t) => {
              const on = settings.theme === t.key;
              return (
                <button key={t.key} onClick={() => updateSettings({ theme: t.key })}
                  style={{ flex: 1, border: 'none', borderRadius: 'var(--r-ctl)', padding: '8px 0', font: '500 13px var(--font-sans)', cursor: 'pointer', background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--card)' : 'var(--ink-soft)' }}>
                  {t.label}
                </button>
              );
            })}
          </div>
        </Card>

        {/* 데이터 백업 */}
        <SectionLabel>데이터 백업</SectionLabel>
        <Card>
          <div style={{ font: '400 12px/1.6 var(--font-sans)', color: 'var(--ink-soft)', marginBottom: 12 }}>
            기록은 이 기기에만 저장돼요. 가끔 백업 파일을 내보내 두면 기기를 바꾸거나 브라우저 데이터를 지워도 복원할 수 있어요.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onExport} style={{ ...btnPrimary, flex: 1, height: 44 }}>내보내기</button>
            <button onClick={() => fileRef.current?.click()} style={{ ...btnDefault, flex: 1, height: 44 }}>가져오기</button>
            <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onImportFile(f); e.target.value = ''; }} />
          </div>
          <div style={{ font: '400 11px/1.5 var(--font-sans)', color: 'var(--ink-mute)', marginTop: 10 }}>
            ※ 가져오기는 현재 기록을 백업 파일 내용으로 <b>덮어씁니다</b>.
          </div>
        </Card>

        {/* 데모 데이터 */}
        <SectionLabel>둘러보기</SectionLabel>
        <Card style={{ padding: '4px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
            <div>
              <div style={{ font: '500 15px var(--font-sans)', color: 'var(--ink)' }}>데모 데이터</div>
              <div style={{ font: '400 12px var(--font-sans)', color: 'var(--ink-mute)', marginTop: 2 }}>1년치 샘플로 통계를 미리 둘러봐요</div>
            </div>
            <Toggle on={demoMode} onClick={() => setDemoMode(!demoMode)} label="데모 데이터" />
          </div>
          <div style={{ font: '400 11px/1.6 var(--font-sans)', color: 'var(--ink-mute)', padding: '0 0 10px' }}>
            데모 데이터와 내 실제 기록은 따로 저장돼요. 끄면 원래 기록으로 돌아갑니다.
          </div>
        </Card>

        {/* iOS 설치 안내 */}
        <SectionLabel>홈 화면에 추가</SectionLabel>
        <Card>
          <div style={{ font: '400 13px/1.7 var(--font-sans)', color: 'var(--ink-soft)' }}>
            <b style={{ fontWeight: 600, color: 'var(--ink)' }}>iPhone (Safari)</b> · 공유 → ‘홈 화면에 추가’<br />
            <b style={{ fontWeight: 600, color: 'var(--ink)' }}>Android (Chrome)</b> · 메뉴 → ‘앱 설치’
          </div>
        </Card>
      </div>

      {msg && (
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 76, zIndex: 60, background: 'var(--ink)', color: 'var(--card)', borderRadius: 'var(--r-card-sm)', padding: '12px 16px', font: '500 13px var(--font-sans)', textAlign: 'center', boxShadow: 'var(--shadow-overlay)', animation: 'slideIn .3s ease' }}>
          {msg}
        </div>
      )}
    </div>
  );
}

function ExRow({ label, w, val, barColor }: { label: string; w: string; val: string; barColor: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ font: '400 11px var(--font-sans)', color: 'var(--ink-soft)', width: 48 }}>{label}</span>
      <div style={{ flex: 1, height: 8, borderRadius: 'var(--r-pill)', background: 'var(--border-bold)', overflow: 'hidden' }}>
        <div style={{ width: `${w}%`, height: '100%', background: barColor, borderRadius: 'var(--r-pill)', transition: 'width .4s' }} />
      </div>
      <span style={{ font: '600 13px var(--font-serif)', color: 'var(--ink)', width: 34, textAlign: 'right' }}>{val}</span>
    </div>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} role="switch" aria-checked={on} aria-label={label}
      style={{ width: 46, height: 27, borderRadius: 'var(--r-pill)', border: 'none', background: on ? 'var(--olive)' : 'var(--border-bold)', position: 'relative', cursor: 'pointer', transition: 'background .25s', flex: 'none' }}>
      <span style={{ position: 'absolute', top: 2.5, left: on ? 21 : 2, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.3)', transition: 'left .25s' }} />
    </button>
  );
}

const miniBtn: React.CSSProperties = {
  width: 30, height: 30, flex: 'none', borderRadius: 'var(--r-ctl)', border: '1px solid var(--line)',
  background: 'var(--card)', color: 'var(--ink-mute)', fontSize: 15, cursor: 'pointer',
};
