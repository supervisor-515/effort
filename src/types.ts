export type Category = { id: string; name: string; color: string };

export type Resistance = 0 | 1 | 2 | 3 | 4 | 5;

export type Entry = {
  id: string;
  date: string; // 'YYYY-MM-DD' (로컬 기준)
  text: string; // 한 줄 내용
  units: number; // 15분 단위 개수 (hours = units * 0.25)
  resistance: Resistance;
  categoryId: string;
  band?: number; // 0~4 시간대(새벽/아침/점심/오후/저녁), 미지정 시 hour로 추정
  hour?: number; // 0~23, 구버전/데모 호환용
};

export type ThemePref = 'auto' | 'light' | 'dark';

export type Settings = {
  resistanceCoef: number; // 기본 0.3
  theme: ThemePref; // 화면 테마
};

export type RangeKey = 'day' | 'week' | 'month' | 'year';
