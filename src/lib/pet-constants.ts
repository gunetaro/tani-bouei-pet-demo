export const NATSUKI_THRESHOLDS: Record<number, number> = { 2: 100, 3: 300 };

export const CARE_POINTS: Record<string, number> = {
  oyasumi: 3,
  ohayou: 5,
  osanpo: 7,
};

export const PET_WORDS: Record<number, Record<string, string>> = {
  1: {
    greet: "……ﾋﾟ",
    happy: "ﾋﾟﾔｯ",
    sad: "……ﾋﾟ",
    oyasumi: "……ﾋﾟｨ",
    ohayou: "ﾜｯ……",
    osanpo: "ﾋﾟ！",
    sick: "ﾋﾟ……",
    reunion: "…ﾋﾟ",
    cancelled: "ﾋﾟ？",
  },
  2: {
    greet: "おはよ",
    happy: "すき！",
    sad: "…さみ",
    oyasumi: "あした…",
    ohayou: "おはよ",
    osanpo: "いこ！",
    sick: "おだいじ",
    reunion: "…いた",
    cancelled: "おやすみ！",
  },
  3: {
    greet: "おはよう！きょうもいっしょだね",
    happy: "だいすき！",
    sad: "…どこいったの…",
    oyasumi: "あしたも いっしょに いこうね！",
    ohayou: "おはよう！まってたよ！",
    osanpo: "おさんぽ たのしかった！",
    sick: "おだいじに、ゆっくりやすんでね",
    reunion: "……ただいま",
    cancelled: "きょうは おうちで いっしょだね！",
  },
};

export function getNatsukiLevel(points: number): number {
  if (points >= NATSUKI_THRESHOLDS[3]) return 3;
  if (points >= NATSUKI_THRESHOLDS[2]) return 2;
  return 1;
}

export type PetStatus = "normal" | "sad" | "distant" | "runaway";

export interface PetState {
  name: string;
  natsuki_level: number;
  natsuki_points: number;
  mood: number;
  consecutive_days: number;
  status: PetStatus;
}
