export type Category = { id: string; name: string; color: string };

export type Resistance = 0 | 1 | 2 | 3 | 4 | 5;

export type Entry = {
  id: string;
  date: string; // 'YYYY-MM-DD' (로컬 기준)
  text: string; // 한 줄 내용
  units: number; // 15분 단위 개수 (hours = units * 0.25)
  resistance: Resistance;
  categoryId: string;
  hour?: number; // 0~23, 시간대 히트맵용(기록 시각 기준, 베스트 에포트)
};

export type Settings = {
  resistanceCoef: number; // 기본 0.3
  reminderOn: boolean;
  reminderTime: string; // 'HH:mm'
};

export type RangeKey = 'day' | 'week' | 'month' | 'year';
