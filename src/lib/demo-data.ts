// デモ用初期データ：1週間分のお世話履歴と日記

export interface DiaryEntry {
  day: number;
  dayLabel: string; // "げつようび" etc
  cares: string[]; // その日にしたお世話
  natsukiLevel: number;
  text: string; // ペット目線の日記
}

export interface TimetableEntry {
  period: number; // 時限
  periodLabel: string; // "1げんめ" etc
  subject: string;
  startTime: string;
}

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri";

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "げつ",
  tue: "か",
  wed: "すい",
  thu: "もく",
  fri: "きん",
};

export const DEMO_TIMETABLE: Record<DayKey, TimetableEntry[]> = {
  mon: [
    { period: 1, periodLabel: "1げんめ", subject: "きそえいご", startTime: "9:00" },
    { period: 3, periodLabel: "3げんめ", subject: "プログラミング入門", startTime: "13:00" },
  ],
  tue: [
    { period: 2, periodLabel: "2げんめ", subject: "せんもんすうがく", startTime: "10:40" },
  ],
  wed: [
    { period: 1, periodLabel: "1げんめ", subject: "にほんごひょうげん", startTime: "9:00" },
    { period: 2, periodLabel: "2げんめ", subject: "データさいえんす", startTime: "10:40" },
  ],
  thu: [
    { period: 3, periodLabel: "3げんめ", subject: "しんりがく", startTime: "13:00" },
  ],
  fri: [
    { period: 1, periodLabel: "1げんめ", subject: "たいいく", startTime: "9:00" },
    { period: 4, periodLabel: "4げんめ", subject: "キャリアデザイン", startTime: "14:40" },
  ],
};

// 1週間分の日記（月〜金 + 土日）
// 月〜水はLv.1、木でLv.2到達、金〜はLv.2の文体
// お世話を毎日フルでこなしている想定（1日15pt × 7日 = 105pt → Lv.2到達）
export const DEMO_DIARY: DiaryEntry[] = [
  {
    day: 1,
    dayLabel: "げつようび",
    cares: ["oyasumi", "ohayou", "osanpo"],
    natsukiLevel: 1,
    text: "ﾋﾟ！ ﾋﾟ！\nだれか きた。\nﾋﾟﾔﾋﾟﾔ ﾋﾟﾔﾋﾟﾔ\nいっしょに あるいた。\n……ﾋﾟｨ",
  },
  {
    day: 2,
    dayLabel: "かようび",
    cares: ["oyasumi", "ohayou", "osanpo"],
    natsukiLevel: 1,
    text: "ﾜｯ ﾜｯ\nまた きた！\nﾋﾟ！！！\nそとに でた。あったかい。\n……ﾋﾟｨ",
  },
  {
    day: 3,
    dayLabel: "すいようび",
    cares: ["oyasumi", "ohayou", "osanpo"],
    natsukiLevel: 1,
    text: "ﾋﾟ！ ﾋﾟ！\nきょうも きた。\nﾋﾟﾔｯ！ ﾋﾟﾔｯ！\nあるく。たのしい。\n……ﾋﾟ……ﾋﾟ",
  },
  {
    day: 4,
    dayLabel: "もくようび",
    cares: ["oyasumi", "ohayou", "osanpo"],
    natsukiLevel: 1,
    text: "ﾜｯ……！\nまいにち くる。このひと。\nﾋﾟ！ ﾋﾟ！ ﾋﾟ！\nいっしょ。うれしい。\n……ﾋﾟ……ﾋﾟｨ",
  },
  {
    day: 5,
    dayLabel: "きんようび",
    cares: ["oyasumi", "ohayou", "osanpo"],
    natsukiLevel: 1,
    text: "ﾋﾟﾔｯ！！\nまた！ また きた！！\nﾋﾟ ﾋﾟ ﾋﾟ！\nずっと いっしょに あるいた。\n…………ﾋﾟ",
  },
  {
    day: 6,
    dayLabel: "どようび",
    cares: [],
    natsukiLevel: 2,
    text: "おやすみ。\nきょうは おうちで のんびり。\nまどの そとを みてた。\n…あした くるかな。",
  },
  {
    day: 7,
    dayLabel: "にちようび",
    cares: [],
    natsukiLevel: 2,
    text: "おやすみ！\nひなたで ごろごろ した。\nいちにち ながい。\nあした…あいたいな。",
  },
];
