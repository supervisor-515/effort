import { useState } from 'react';
import { useStore } from '../store';
import { Card, ScreenHeader, SectionLabel } from '../components/ui';

export function SettingsScreen() {
  const {
    categories, settings, demoMode,
    addCategory, removeCategory, updateSettings, setDemoMode,
  } = useStore();
  const [newCat, setNewCat] = useState('');
  const coef = settings.resistanceCoef;

  const ex = (r: number) => 1 * (1 + r * coef);
  const exMax = ex(5);
  const exW = (r: number) => ((ex(r) / exMax) * 100).toFixed(0);

  const onToggleRemind = async () => {
    const next = !settings.reminderOn;
    if (next && 'Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch { /* 무시 */ }
    }
    updateSettings({ reminderOn: next });
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <ScreenHeader title="설정" sub="기록의 규칙을 내게 맞춰요" />
      <div className="scr" style={{ flex: 1, padding: '0 18px 24px' }}>
        {/* 저항 계수 */}
        <SectionLabel style={{ margin: '6px 6px 12px' }}>노력 계산</SectionLabel>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ font: '500 14px var(--font-sans)', color: 'var(--ink)' }}>저항 계수</span>
            <span style={{ font: '500 24px var(--font-serif)', color: 'var(--clay)' }}>{coef.toFixed(2)}</span>
          </div>
          <div style={{ font: '400 12px/1.5 var(--font-sans)', color: '#8B8270', margin: '6px 0 14px' }}>
            저항도가 노력 점수를 얼마나 키울지 정해요. 클수록 ‘버텨낸 노력’을 더 높게 칩니다.
          </div>
          <input type="range" className="res" min={0.1} max={0.5} step={0.05} value={coef} onChange={(e) => updateSettings({ resistanceCoef: Number(e.target.value) })} />
          <div style={{ display: 'flex', justifyContent: 'space-between', font: '400 10.5px var(--font-sans)', color: '#B4AB98', marginTop: 5 }}>
            <span>0.10 · 완만</span><span>0.50 · 가파름</span>
          </div>
          <div style={{ background: 'var(--card-2)', borderRadius: 12, padding: '13px 14px', marginTop: 16 }}>
            <div style={{ font: '400 11px var(--font-sans)', color: 'var(--ink-mute)', marginBottom: 10 }}>투입 1시간 기준 — 저항도별 노력 점수</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <ExRow label="저항 0" w={exW(0)} val={ex(0).toFixed(2)} barColor="#6F7252" />
              <ExRow label="저항 3" w={exW(3)} val={ex(3).toFixed(2)} barColor="#9A7F52" />
              <ExRow label="저항 5" w={exW(5)} val={ex(5).toFixed(2)} barColor="#C07B53" />
            </div>
          </div>
        </Card>

        {/* 카테고리 관리 */}
        <SectionLabel>카테고리 관리</SectionLabel>
        <Card style={{ padding: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {categories.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderBottom: '1px solid #F1EADC' }}>
                <span style={{ width: 12, height: 12, borderRadius: 4, background: c.color, flex: 'none' }} />
                <span style={{ flex: 1, font: '500 15px var(--font-sans)', color: 'var(--ink)' }}>{c.name}</span>
                <button onClick={() => removeCategory(c.id)} aria-label="삭제" style={{ width: 30, height: 30, borderRadius: 9, border: '1px solid #EFE7D7', background: 'var(--card)', color: '#C3B9A4', fontSize: 16, cursor: 'pointer', flex: 'none' }}>×</button>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12 }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, border: '1.5px dashed #CFC4B0', flex: 'none' }} />
              <input
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { addCategory(newCat); setNewCat(''); } }}
                placeholder="새 카테고리 이름"
                size={1}
                style={{ flex: '1 1 0%', minWidth: 0, border: 'none', background: 'transparent', font: '500 15px var(--font-sans)', color: 'var(--ink)', outline: 'none' }}
              />
              <button onClick={() => { addCategory(newCat); setNewCat(''); }} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: 'var(--olive)', color: 'var(--card)', font: '600 13px var(--font-sans)', cursor: 'pointer', flex: 'none' }}>추가</button>
            </div>
          </div>
        </Card>

        {/* 알림 */}
        <SectionLabel>알림</SectionLabel>
        <Card style={{ padding: '6px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #F1EADC' }}>
            <div>
              <div style={{ font: '500 15px var(--font-sans)', color: 'var(--ink)' }}>입력 리마인더</div>
              <div style={{ font: '400 12px var(--font-sans)', color: 'var(--ink-mute)', marginTop: 2 }}>매일 기록을 잊지 않게</div>
            </div>
            <Toggle on={settings.reminderOn} onClick={onToggleRemind} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', opacity: settings.reminderOn ? 1 : 0.45, transition: 'opacity .25s' }}>
            <div style={{ font: '500 15px var(--font-sans)', color: 'var(--ink)' }}>알림 시간</div>
            <input type="time" value={settings.reminderTime} onChange={(e) => updateSettings({ reminderTime: e.target.value })} disabled={!settings.reminderOn} style={{ font: '500 16px var(--font-serif)', color: 'var(--ink)', border: '1px solid #E4DCCB', background: 'var(--surface)', borderRadius: 11, padding: '8px 12px', outline: 'none' }} />
          </div>
          <div style={{ font: '400 11px/1.6 var(--font-sans)', color: 'var(--ink-mute)', padding: '0 0 12px' }}>
            ※ 브라우저·기기 정책에 따라 백그라운드 알림은 동작하지 않을 수 있어요. 설정값은 항상 저장됩니다.
          </div>
        </Card>

        {/* 데모 데이터 */}
        <SectionLabel>둘러보기</SectionLabel>
        <Card style={{ padding: '6px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
            <div>
              <div style={{ font: '500 15px var(--font-sans)', color: 'var(--ink)' }}>데모 데이터</div>
              <div style={{ font: '400 12px var(--font-sans)', color: 'var(--ink-mute)', marginTop: 2 }}>1년치 샘플로 통계를 미리 둘러봐요</div>
            </div>
            <Toggle on={demoMode} onClick={() => setDemoMode(!demoMode)} />
          </div>
          <div style={{ font: '400 11px/1.6 var(--font-sans)', color: 'var(--ink-mute)', padding: '0 0 12px' }}>
            데모 데이터와 내 실제 기록은 따로 저장돼요. 끄면 원래 기록으로 돌아갑니다.
          </div>
        </Card>

        {/* iOS 설치 안내 */}
        <SectionLabel>홈 화면에 추가</SectionLabel>
        <Card style={{ padding: 16 }}>
          <div style={{ font: '400 13px/1.7 var(--font-sans)', color: 'var(--ink-soft)' }}>
            <b style={{ fontWeight: 600 }}>iPhone (Safari)</b> · 공유 버튼 <span aria-hidden>􀈂</span> → ‘홈 화면에 추가’를 누르면 앱처럼 열려요.<br />
            <b style={{ fontWeight: 600 }}>Android (Chrome)</b> · 하단 안내 또는 메뉴 → ‘앱 설치’를 누르세요.
          </div>
        </Card>
      </div>
    </div>
  );
}

function ExRow({ label, w, val, barColor }: { label: string; w: string; val: string; barColor: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ font: '400 11px var(--font-sans)', color: '#8B8270', width: 48 }}>{label}</span>
      <div style={{ flex: 1, height: 8, borderRadius: 99, background: '#E6DECB', overflow: 'hidden' }}>
        <div style={{ width: `${w}%`, height: '100%', background: barColor, borderRadius: 99, transition: 'width .4s' }} />
      </div>
      <span style={{ font: '500 13px var(--font-serif)', color: 'var(--ink)', width: 34, textAlign: 'right' }}>{val}</span>
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={on} style={{ width: 46, height: 27, borderRadius: 99, border: 'none', background: on ? 'var(--olive)' : '#D8D3BD', position: 'relative', cursor: 'pointer', transition: 'background .25s', flex: 'none' }}>
      <span style={{ position: 'absolute', top: 2.5, left: on ? 21 : 2, width: 22, height: 22, borderRadius: '50%', background: 'var(--card)', boxShadow: '0 1px 3px rgba(60,40,20,.3)', transition: 'left .25s' }} />
    </button>
  );
}
