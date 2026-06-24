import type { ReactNode } from 'react';

const OVERLAY: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 200,
  background: 'var(--surface)',
  display: 'flex',
  flexDirection: 'column',
  animation: 'fadeUp .3s ease',
};

export function GuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div style={OVERLAY} role="dialog" aria-label="사용 안내">
      {/* 헤더 */}
      <div style={{ flex: 'none', padding: 'calc(env(safe-area-inset-top,0px) + 16px) 20px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--line)' }}>
        <div>
          <div style={{ font: '700 22px var(--font-sans)', letterSpacing: '-0.01em', color: 'var(--ink)' }}>노력 기록 사용 안내</div>
          <div style={{ font: '400 13px var(--font-sans)', color: 'var(--ink-soft)', marginTop: 2 }}>처음이라면 여기부터</div>
        </div>
        <button onClick={onClose} aria-label="닫기" style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink-soft)', fontSize: 18, cursor: 'pointer', flex: 'none' }}>×</button>
      </div>

      {/* 본문 */}
      <div className="scr" style={{ flex: 1, padding: '18px 20px 8px' }}>
        <P>“얼마나 많이 했나”를 채점하는 앱이 아니라, <B>내가 들인 노력을 따뜻하게 읽어주는 기록장</B>이에요. 즐겁게 한 일도, 하기 싫었지만 해낸 일도 똑같이 가치 있게 기록합니다. 모든 데이터는 <B>내 기기에만</B> 저장돼요.</P>

        <H>30초 만에 첫 기록</H>
        <Steps
          items={[
            '아래 ① 입력 탭으로 들어가요.',
            '맨 아래 입력창에서 시간(−/＋ 15분 단위) → 저항도(0~5) → 카테고리 → “무엇을 했나요?” 한 줄을 채워요.',
            '＋ 항목 추가하기 를 누르면 위 카드의 점수가 톡 올라가요. (Enter로도 추가)',
          ]}
        />

        <H>딱 세 가지 개념</H>
        <Sub>① 노력 점수</Sub>
        <Code>점수 = 투입시간 × (1 + 저항도 × 계수)</Code>
        <P>계수는 기본 0.3. 예) 1시간·저항 0 → <B>1.0점</B>, 1시간·저항 5 → <B>2.5점</B>. 같은 시간이라도 더 버틴 일에 더 높은 점수가 매겨져요.</P>
        <Sub>② 저항도 0~5 (얼마나 하기 싫었나)</Sub>
        <P style={{ color: 'var(--ink-soft)' }}>0 편하게 함 · 1 살짝 귀찮음 · 2 미루고 싶었음 · 3 하기 싫었음 · 4 진짜 버팀 · 5 나를 이김</P>
        <Sub>③ 두 종류의 노력</Sub>
        <P>
          <Dot c="var(--olive)" /> <B>즐겁게 한 노력</B>(저항 0~2) &nbsp; <Dot c="var(--clay)" /> <B>버텨낸 노력</B>(저항 3~5).
          앱 곳곳의 2색 막대·도넛이 바로 이 비율이에요.
        </P>

        <H>화면 안내</H>
        <Sub>① 입력</Sub>
        <List items={[
          '맨 위 ‹ › 로 날짜 이동 — 과거는 소급 입력, 미래는 비활성.',
          '누적 카드: 그날 총점·시간·항목 수·즐겁게/버텨냄 막대·연속 기록 뱃지.',
          '입력창 바(핸들)는 탭하거나 잡고 끌어 여닫아요. 리스트를 톡 누르면 자동으로 접혀요.',
          '항목의 × 로 삭제.',
        ]} />
        <Sub>② 통계</Sub>
        <List items={[
          '일/주/월/연 토글로 모든 통계가 그 기간 기준으로 바뀜.',
          '요약: 기간 노력량 + 증감(▲늘었음/▼줄었음) + 투입시간·평균저항·버텨낸비율.',
          '한 줄 회고: 그 기간의 흐름을 문장으로 읽어줘요.',
          '노력의 흐름: 누적 막대 + 추세선. 일 단위에선 7/30일 평균 토글, 막대를 탭하면 요약이 열려요.',
          '도넛·카테고리 프리뷰에서 상세 분석으로 들어갈 수 있어요.',
        ]} />
        <Sub>저항 분석 · 카테고리 분석</Sub>
        <List items={[
          '저항 분석: 평균 저항 변화, 회복 신호, 요일별 저항, 요일×시간대 히트맵.',
          '카테고리 분석: 누적 노력량, 성장 점수 랭킹(버텨낸 노력 합), 노력 사분면(점을 탭하면 해석).',
        ]} />
        <Sub>월간 리포트 · 아카이브 · 노력 달력</Sub>
        <List items={[
          '리포트: 영수증처럼 한 장 요약 + 노력 스타일 + 저장/공유.',
          '아카이브: 가장 많이 버틴 날, 가장 오래 쌓은 날 등 하이라이트.',
          '노력 달력: 1년치 기록을 잔디처럼 한눈에. 색이 진할수록 그날 노력이 많아요.',
        ]} />
        <Sub>③ 설정</Sub>
        <List items={[
          '저항 계수(0.10~0.50) 조절.',
          '하루 목표 점수: 입력 화면 진행 막대와 통계 ‘목표 달성 일수’ 기준.',
          '카테고리 추가·이름/색 변경·순서 변경·삭제.',
          '화면 테마(자동/라이트/다크).',
          '전체 기록 누적(총 노력량·시간·기록한 날).',
          '데이터 백업 내보내기·가져오기(JSON), CSV 내보내기(엑셀·외부 분석용).',
          '데모 데이터: 1년치 샘플로 통계를 미리 둘러보기(실제 기록과 분리 저장).',
        ]} />

        <H>알아두면 좋아요</H>
        <List items={[
          '기록을 탭하면 내용·시간·저항·카테고리를 수정할 수 있어요.',
          '실수로 지워도 ‘되돌리기’로 복구할 수 있어요.',
          '깜빡한 날도 ‹ 로 과거로 가서 적을 수 있어요.',
          '오래 쓰려면 설정 → 데이터 백업으로 가끔 내보내 두세요. 브라우저 데이터를 지우면 기록도 사라질 수 있어요.',
          '하루 끝에 딱 한 줄이면 충분해요. 며칠 쌓이면 통계가 흐름을 읽어줍니다.',
        ]} />

        <P style={{ color: 'var(--ink-mute)', marginTop: 20, marginBottom: 4 }}>열 때마다 “오, 이만큼 했네” 하는 잔잔한 뿌듯함 — 그게 이 앱의 목적이에요.</P>
      </div>

      {/* 푸터 */}
      <div style={{ flex: 'none', padding: '12px 20px calc(env(safe-area-inset-bottom,0px) + 16px)', borderTop: '1px solid var(--line)' }}>
        <button onClick={onClose} style={{ width: '100%', height: 52, borderRadius: 10, border: 'none', background: 'var(--olive)', color: 'var(--card)', font: '600 16px var(--font-sans)', cursor: 'pointer' }}>
          시작하기
        </button>
      </div>
    </div>
  );
}

function H({ children }: { children: ReactNode }) {
  return <div style={{ font: '700 15px var(--font-sans)', color: 'var(--ink)', margin: '24px 2px 10px' }}>{children}</div>;
}
function Sub({ children }: { children: ReactNode }) {
  return <div style={{ font: '600 14px var(--font-sans)', color: 'var(--ink)', margin: '14px 2px 6px' }}>{children}</div>;
}
function P({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <p style={{ font: '400 14px/1.7 var(--font-sans)', color: 'var(--ink-soft)', margin: '0 2px 6px', ...style }}>{children}</p>;
}
function B({ children }: { children: ReactNode }) {
  return <b style={{ fontWeight: 600, color: 'var(--ink)' }}>{children}</b>;
}
function Code({ children }: { children: ReactNode }) {
  return <div style={{ font: '500 13px ui-monospace, monospace', color: 'var(--ink)', background: 'var(--card-2)', borderRadius: 10, padding: '10px 12px', margin: '4px 2px 8px' }}>{children}</div>;
}
function Dot({ c }: { c: string }) {
  return <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: c, marginRight: 2, verticalAlign: 'middle' }} />;
}
function Steps({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '2px 0 4px' }}>
      {items.map((t, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ flex: 'none', width: 22, height: 22, borderRadius: '50%', background: 'var(--olive)', color: 'var(--card)', font: '600 12px var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
          <span style={{ font: '400 14px/1.55 var(--font-sans)', color: 'var(--ink-soft)' }}>{t}</span>
        </div>
      ))}
    </div>
  );
}
function List({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '2px 0 4px' }}>
      {items.map((t, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span style={{ flex: 'none', marginTop: 8, width: 5, height: 5, borderRadius: '50%', background: 'var(--clay)' }} />
          <span style={{ font: '400 14px/1.55 var(--font-sans)', color: 'var(--ink-soft)' }}>{t}</span>
        </div>
      ))}
    </div>
  );
}
