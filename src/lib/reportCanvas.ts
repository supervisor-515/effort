/** 월간 리포트를 의존성 없이 canvas 영수증 이미지(PNG Blob)로 렌더링한다.
 *  내보내는 이미지는 앱 테마와 무관하게 따뜻한 라이트 팔레트로 고정한다. */

export type ReportImageData = {
  year: number;
  monthLabel: string; // 예: '6월'
  total: string;
  hours: string;
  avgRes: string;
  clayPct: number;
  stability: number;
  topCat: string;
  topClay: string;
  topJoy: string;
  bestDay: string;
  style: string;
  note: string;
};

const C = {
  surface: '#f6f2ea',
  card: '#ffffff',
  card2: '#f4f0e7',
  line: '#e7e1d4',
  bold: '#d7cfbf',
  ink: '#26231e',
  inkSoft: '#5a5347',
  inkMute: '#7c7565',
  olive: '#6f7252',
  oliveText: '#50612f',
  clay: '#c07b53',
  clayAccent: '#9a5a30',
};

const SANS = "'Pretendard', -apple-system, system-ui, sans-serif";
const SERIF = "'Fraunces', Georgia, serif";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function dashed(ctx: CanvasRenderingContext2D, x1: number, y: number, x2: number) {
  ctx.save();
  ctx.strokeStyle = C.bold;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function renderReportPng(d: ReportImageData): Promise<Blob> {
  const W = 380;
  const PAD = 26;
  const dpr = Math.min(3, Math.max(2, Math.round(window.devicePixelRatio || 2)));
  // 높이는 넉넉히 잡고 실제 콘텐츠 높이에 맞춰 자르지 않고 고정 사용
  const H = 660;

  const canvas = document.createElement('canvas');
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  ctx.textBaseline = 'alphabetic';

  // 배경
  ctx.fillStyle = C.surface;
  ctx.fillRect(0, 0, W, H);
  // 카드
  ctx.fillStyle = C.card;
  roundRect(ctx, 12, 12, W - 24, H - 24, 16);
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.stroke();

  const cx = W / 2;
  let y = 56;

  // eyebrow
  ctx.textAlign = 'center';
  ctx.fillStyle = C.clayAccent;
  ctx.font = `700 12px ${SANS}`;
  ctx.fillText(`${d.year}년 월간 요약`, cx, y);
  y += 30;
  // title
  ctx.fillStyle = C.ink;
  ctx.font = `600 30px ${SERIF}`;
  ctx.fillText(`${d.monthLabel}의 노력 리포트`, cx, y);
  y += 22;
  dashed(ctx, PAD, y, W - PAD);
  y += 34;

  // 큰 셀 2개
  const bigMaxW = W / 2 - 46; // 가운데 분리선과 닿지 않도록 한 칸 안전 폭
  const drawBig = (x: number, value: string, label: string) => {
    ctx.textAlign = 'center';
    ctx.fillStyle = C.ink;
    let size = 28;
    ctx.font = `500 ${size}px ${SERIF}`;
    while (size > 16 && ctx.measureText(value).width > bigMaxW) {
      size -= 1;
      ctx.font = `500 ${size}px ${SERIF}`;
    }
    ctx.fillText(value, x, y);
    ctx.fillStyle = C.inkMute;
    ctx.font = `400 11px ${SANS}`;
    ctx.fillText(label, x, y + 18);
  };
  drawBig(W * 0.3, d.total, '총 노력량');
  drawBig(W * 0.7, d.hours, '총 투입 시간');
  // 가운데 구분선
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, y - 26);
  ctx.lineTo(cx, y + 6);
  ctx.stroke();
  y += 44;

  // 중간 셀 3개
  const midW = (W - PAD * 2 - 16) / 3;
  const mids: [string, string, string][] = [
    [d.avgRes, '평균 저항도', C.ink],
    [`${d.clayPct}%`, '버텨낸 비율', C.clay],
    [String(d.stability), '안정감 지수', C.olive],
  ];
  mids.forEach((m, i) => {
    const x = PAD + i * (midW + 8);
    ctx.fillStyle = C.card2;
    roundRect(ctx, x, y, midW, 56, 8);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = m[2];
    ctx.font = `500 21px ${SERIF}`;
    ctx.fillText(m[0], x + midW / 2, y + 26);
    ctx.fillStyle = C.inkMute;
    ctx.font = `400 10px ${SANS}`;
    ctx.fillText(m[1], x + midW / 2, y + 44);
  });
  y += 84;

  // 행 목록
  const rows: [string, string, string][] = [
    ['가장 많이 쌓인 영역', d.topCat, C.oliveText],
    ['가장 많이 버틴 영역', d.topClay, C.clayAccent],
    ['가장 편하게 이어간 영역', d.topJoy, C.oliveText],
    ['가장 노력한 날', d.bestDay, C.ink],
  ];
  rows.forEach((r, i) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = C.inkSoft;
    ctx.font = `400 13px ${SANS}`;
    ctx.fillText(r[0], PAD, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = r[2];
    ctx.font = `600 13px ${SANS}`;
    ctx.fillText(r[1], W - PAD, y);
    if (i < rows.length - 1) {
      ctx.strokeStyle = '#efeadf';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, y + 11);
      ctx.lineTo(W - PAD, y + 11);
      ctx.stroke();
    }
    y += 30;
  });
  y += 6;

  // 노력 스타일 박스 (올리브)
  ctx.fillStyle = C.olive;
  const noteLines = (() => {
    ctx.font = `400 13px ${SANS}`;
    return wrap(ctx, d.note, W - PAD * 2 - 28);
  })();
  const boxH = 64 + noteLines.length * 19;
  roundRect(ctx, PAD, y, W - PAD * 2, boxH, 12);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = `700 11px ${SANS}`;
  ctx.fillText('이번 달 노력 스타일', PAD + 14, y + 24);
  ctx.fillStyle = '#ffffff';
  ctx.font = `500 20px ${SERIF}`;
  ctx.fillText(d.style, PAD + 14, y + 48);
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.font = `400 13px ${SANS}`;
  noteLines.forEach((ln, i) => ctx.fillText(ln, PAD + 14, y + 70 + i * 19));
  y += boxH + 26;

  // 푸터
  dashed(ctx, PAD, y, W - PAD);
  y += 22;
  ctx.textAlign = 'center';
  ctx.fillStyle = C.inkMute;
  ctx.font = `400 11px ${SANS}`;
  ctx.fillText(`묵묵히 쌓은 ${d.monthLabel}의 기록 · 노력 기록`, cx, y);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지 생성 실패'))), 'image/png');
  });
}
