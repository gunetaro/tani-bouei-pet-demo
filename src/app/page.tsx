"use client";

import { useState, useCallback, useRef } from "react";
import Ghost from "@/components/Ghost";
import Live2DGhost from "@/components/Live2DGhost";
import Diary from "@/components/Diary";
import Timetable from "@/components/Timetable";
import {
  PET_WORDS,
  CARE_POINTS,
  NATSUKI_THRESHOLDS,
  getNatsukiLevel,
  type PetState,
  type PetStatus,
} from "@/lib/pet-constants";
import { DEMO_DIARY, type DiaryEntry } from "@/lib/demo-data";

// 1週間経過後の状態（7日 × 15pt = 105pt → Lv.2）
const INITIAL_PET: PetState = {
  name: "おばけちゃん",
  natsuki_level: 2,
  natsuki_points: 105,
  mood: 80,
  consecutive_days: 5,
  status: "normal",
};

const DIARY_LV_TEMPLATES: Record<number, Record<string, string>> = {
  1: {
    full: "ﾋﾟ！ ﾋﾟ！\nだれか きた。\nﾋﾟﾔﾋﾟﾔ！\nいっしょに あるいた。\n……ﾋﾟｨ",
    partial_ohayou: "ﾜｯ ﾜｯ\nきた！\nでも おさんぽは なかった。\n……ﾋﾟ",
    partial_oyasumi: "……ﾋﾟｨ\nおやすみ だけ きた。\n……ﾋﾟ",
    none: "……………\n…………\n………",
  },
  2: {
    full: "おはよ！きょうも きた！\nおさんぽ たのし！\nいっぱい あるいた。\nおやすみ…あしたもね。",
    partial_ohayou: "おはよ！\nきたけど おさんぽは なかった。\n…ちょっと さみしい。",
    partial_oyasumi: "おやすみ だけ きた。\n…あしたは いっしょに いけるかな。",
    none: "…こない。\nきょうも ひとり。\n…さみしい。",
  },
  3: {
    full: "おはよう！きょうも いっしょに おさんぽしたよ！\nたのしかった！\nあしたも いっしょに いこうね。\nおやすみなさい！",
    partial_ohayou: "おはよう！って いってくれた。\nでも おさんぽには いけなかった。\nあしたは いけるといいな。",
    partial_oyasumi: "おやすみ って きてくれた。\nでも あさは こなかったな…\nあしたは おはよう いってほしいな。",
    none: "…きょうは だれも こなかった。\nまどの そとを ずっと みてた。\n…あいたいな。",
  },
};

const DAY_NAMES = [
  "げつようび", "かようび", "すいようび", "もくようび", "きんようび",
  "どようび", "にちようび",
];

function generateDiaryText(
  level: number,
  cares: Record<string, boolean>
): string {
  const templates = DIARY_LV_TEMPLATES[level] || DIARY_LV_TEMPLATES[1];
  const done = Object.entries(cares).filter(([, v]) => v).map(([k]) => k);

  if (done.length === 3) return templates.full;
  if (done.includes("ohayou") && done.includes("osanpo")) return templates.full;
  if (done.includes("ohayou")) return templates.partial_ohayou;
  if (done.includes("oyasumi")) return templates.partial_oyasumi;
  if (done.length > 0) return templates.partial_ohayou;
  return templates.none;
}

type Screen = "home" | "timetable" | "diary";

export default function DemoPage() {
  const [screen, setScreen] = useState<Screen>("home");
  const [pet, setPet] = useState<PetState>({ ...INITIAL_PET });
  const [todayCare, setTodayCare] = useState<Record<string, boolean>>({
    oyasumi: false,
    ohayou: false,
    osanpo: false,
  });
  const [message, setMessage] = useState("");
  const [isHappy, setIsHappy] = useState(false);
  const [dayCount, setDayCount] = useState(8);
  const [showPanel, setShowPanel] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);
  const [oyasumiDone, setOyasumiDone] = useState(false);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([...DEMO_DIARY]);

  const msgTimeout = useRef<NodeJS.Timeout>(null);

  const showMessage = useCallback((msg: string, duration = 2500) => {
    setMessage(msg);
    if (msgTimeout.current) clearTimeout(msgTimeout.current);
    msgTimeout.current = setTimeout(() => setMessage(""), duration);
  }, []);

  const playHappy = useCallback(() => {
    setIsHappy(true);
    setTimeout(() => setIsHappy(false), 1200);
  }, []);

  const doCare = useCallback(
    (careType: string) => {
      if (pet.status === "runaway") {
        showMessage("いえで しちゃった…");
        return;
      }
      if (isHoliday) {
        showMessage("きょうは おやすみだよ");
        return;
      }
      if (todayCare[careType]) {
        showMessage("もうやったよ！");
        return;
      }

      const points = CARE_POINTS[careType];
      const newPoints = pet.natsuki_points + points;
      const newLevel = getNatsukiLevel(newPoints);
      const levelUp = newLevel > pet.natsuki_level;
      const newMood = Math.min(100, pet.mood + 10);
      const newConsecutive =
        careType === "osanpo"
          ? pet.consecutive_days + 1
          : pet.consecutive_days;
      const newStatus: PetStatus =
        pet.status === "sad" || pet.status === "distant" ? "normal" : pet.status;

      setPet({
        ...pet,
        natsuki_points: newPoints,
        natsuki_level: newLevel,
        mood: newMood,
        consecutive_days: newConsecutive,
        status: newStatus,
      });
      setTodayCare((prev) => ({ ...prev, [careType]: true }));
      playHappy();

      const words = PET_WORDS[pet.natsuki_level] || PET_WORDS[1];
      showMessage(words[careType] || words.happy);

      if (careType === "oyasumi") {
        setOyasumiDone(true);
        setTimeout(
          () => showMessage("あしたの じゅぎょうを かくにんしよう", 3500),
          2800
        );
      }

      if (levelUp) {
        setTimeout(
          () => showMessage(`♪ なつきレベルが ${newLevel} になった！`, 3500),
          1500
        );
      }
    },
    [pet, todayCare, isHoliday, showMessage, playHappy]
  );

  // --- デモ操作 ---
  const advanceDay = () => {
    const dayIndex = (dayCount - 1) % 7;
    const newEntry: DiaryEntry = {
      day: dayCount,
      dayLabel: DAY_NAMES[dayIndex],
      cares: Object.entries(todayCare)
        .filter(([, v]) => v)
        .map(([k]) => k),
      natsukiLevel: pet.natsuki_level,
      text: isHoliday
        ? (pet.natsuki_level >= 2
            ? "おやすみ！\nきょうは のんびり すごしたよ。\nまどの そとを みてた。"
            : "ﾋﾟ……\nのんびり。\n……ﾋﾟ")
        : generateDiaryText(pet.natsuki_level, todayCare),
    };
    setDiaryEntries((prev) => [...prev, newEntry]);
    setTodayCare({ oyasumi: false, ohayou: false, osanpo: false });
    setOyasumiDone(false);
    setDayCount((d) => d + 1);

    if (!isHoliday) {
      const caresDone = Object.values(todayCare).filter(Boolean).length;
      if (caresDone === 0 && pet.status !== "runaway") {
        const newMood = Math.max(0, pet.mood - 20);
        const newStatus: PetStatus = newMood < 20 ? "sad" : pet.status;
        setPet((p) => ({ ...p, mood: newMood, status: newStatus }));
        showMessage("…きょうは だれも こなかった");
      } else {
        showMessage("あたらしい いちにちが はじまった！");
      }
    } else {
      showMessage("あたらしい いちにちが はじまった！");
    }
    setIsHoliday(false);
  };

  const triggerRunaway = () => {
    setPet((p) => ({ ...p, status: "runaway", mood: 0 }));
    showMessage("……いなくなっちゃった");
  };

  const triggerReturn = () => {
    if (pet.status !== "runaway") return;
    setPet((p) => ({ ...p, status: "sad", mood: 20 }));
    const words = PET_WORDS[pet.natsuki_level] || PET_WORDS[1];
    showMessage(words.reunion);
    playHappy();
  };

  const skipLevel = () => {
    if (pet.natsuki_level >= 3) {
      showMessage("もう さいこうレベル！");
      return;
    }
    const nextLevel = pet.natsuki_level + 1;
    const nextPoints = NATSUKI_THRESHOLDS[nextLevel] || pet.natsuki_points;
    setPet((p) => ({
      ...p,
      natsuki_level: nextLevel,
      natsuki_points: nextPoints,
    }));
    showMessage(`♪ なつきレベルが ${nextLevel} になった！`, 3500);
    playHappy();
  };

  const resetAll = () => {
    setPet({ ...INITIAL_PET });
    setTodayCare({ oyasumi: false, ohayou: false, osanpo: false });
    setDayCount(8);
    setDiaryEntries([...DEMO_DIARY]);
    setIsHoliday(false);
    setOyasumiDone(false);
    showMessage("リセットしたよ！");
  };

  const toggleHoliday = () => {
    setIsHoliday((prev) => !prev);
    if (!isHoliday) {
      const words = PET_WORDS[pet.natsuki_level] || PET_WORDS[1];
      showMessage(words.cancelled);
    } else {
      showMessage("へいじつに もどったよ");
    }
  };

  // --- 表示計算 ---
  const nextLevelPoints =
    pet.natsuki_level < 3 ? NATSUKI_THRESHOLDS[pet.natsuki_level + 1] : null;
  const currentThreshold = NATSUKI_THRESHOLDS[pet.natsuki_level] || 0;
  const progressPercent = nextLevelPoints
    ? Math.min(
        100,
        ((pet.natsuki_points - currentThreshold) /
          (nextLevelPoints - currentThreshold)) *
          100
      )
    : 100;
  const moodEmoji = pet.mood >= 70 ? "◎" : pet.mood >= 40 ? "○" : "△";

  // --- 時間割画面 ---
  if (screen === "timetable") {
    return <Timetable onClose={() => setScreen("home")} />;
  }

  // --- 日記画面 ---
  if (screen === "diary") {
    return <Diary entries={diaryEntries} onClose={() => setScreen("home")} />;
  }

  // --- ホーム画面 ---
  return (
    <div className="min-h-screen bg-[#F5F4EE] flex flex-col items-center px-4 py-6">
      {/* ヘッダー */}
      <div className="w-full max-w-sm flex justify-between items-center mb-4">
        <span className="font-mono text-lg tracking-wider text-gray-600">
          たんいぼうえいペット
        </span>
        <div className="flex gap-2 items-center">
          {isHoliday && (
            <span className="text-xs text-blue-400 font-mono border border-blue-300 rounded-full px-2 py-0.5">
              おやすみ
            </span>
          )}
          <span className="text-xs text-orange-400 font-mono border border-orange-300 rounded-full px-2 py-0.5">
            デモ版
          </span>
        </div>
      </div>

      {/* ペット画面 */}
      <div className="w-full max-w-sm bg-[#C5CCA1] border-[6px] border-gray-500 rounded-2xl p-6 flex flex-col items-center relative shadow-lg">
        {/* なつき度（おばけの上） */}
        <div className="flex flex-col items-center gap-1 mb-2">
          <span className="text-xs text-gray-600 font-mono">
            きぶん: {moodEmoji}　{pet.consecutive_days}日れんぞく　({dayCount}日目)
          </span>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((i) => (
              <svg
                key={i}
                viewBox="0 0 16 14"
                className="w-4 h-3.5"
              >
                <path
                  d="M8,3 C8,1 6.5,0 5,0 C3,0 1,1.5 1,4 C1,8 8,13 8,13 C8,13 15,8 15,4 C15,1.5 13,0 11,0 C9.5,0 8,1 8,3 Z"
                  fill={i <= pet.natsuki_level ? "#E24B4A" : "#D3D1C7"}
                />
              </svg>
            ))}
          </div>
        </div>

        <div className="w-44 h-44">
          {pet.status === "runaway" ? (
            <Ghost
              status={pet.status}
              mood={pet.mood}
              natsukiLevel={pet.natsuki_level}
              isHappy={isHappy}
            />
          ) : (
            <Live2DGhost
              status={pet.status}
              mood={pet.mood}
              natsukiLevel={pet.natsuki_level}
              isHappy={isHappy}
            />
          )}
        </div>

        {/* ふきだし（下部中央） */}
        {message && (
          <div className="mt-2 bg-white border-2 border-gray-500 rounded-xl px-3 py-1.5 text-sm font-mono text-gray-700 animate-fade-in max-w-[240px] text-center">
            {message}
          </div>
        )}
      </div>

      {/* お世話ボタン */}
      {pet.status !== "runaway" && !isHoliday && (
        <div className="flex gap-2 mt-5">
          {[
            { type: "ohayou", label: "☀️ おはよう" },
            { type: "osanpo", label: "🚶 とうこう" },
            { type: "oyasumi", label: "🌙 おやすみ" },
          ].map(({ type, label }) => (
            <button
              key={type}
              onClick={() => doCare(type)}
              disabled={todayCare[type]}
              className={`
                px-3 py-2.5 rounded-full border-2 font-mono text-sm whitespace-nowrap transition-all duration-200
                ${
                  todayCare[type]
                    ? "border-green-300 bg-green-50 text-green-600"
                    : "border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:shadow-sm active:translate-y-0.5"
                }
                disabled:cursor-default
              `}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* 休日メッセージ */}
      {isHoliday && pet.status !== "runaway" && (
        <p className="mt-5 font-mono text-sm text-gray-400">
          きょうは おやすみ。のんびりしよう。
        </p>
      )}

      {/* 家出中の帰還ボタン */}
      {pet.status === "runaway" && (
        <button
          onClick={triggerReturn}
          className="mt-5 px-5 py-2.5 rounded-full border-2 border-dashed border-gray-400 bg-white text-gray-500 font-mono text-sm hover:border-gray-500 transition-all duration-200 active:translate-y-0.5"
        >
          おうちに もどす
        </button>
      )}

      {/* なつきプログレスバー */}
      <div className="w-full max-w-sm mt-6">
        <div className="flex justify-between text-xs text-gray-400 font-mono mb-1">
          <span>なつき Lv.{pet.natsuki_level}</span>
          <span>
            {nextLevelPoints
              ? `${pet.natsuki_points} / ${nextLevelPoints} pt`
              : "MAX ♪"}
          </span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPercent}%`,
              backgroundColor:
                pet.natsuki_level >= 3
                  ? "#7F77DD"
                  : pet.natsuki_level >= 2
                  ? "#5DCAA5"
                  : "#85B7EB",
            }}
          />
        </div>
      </div>

      {/* ナビゲーション（本番と同じUI） */}
      <div className="w-full max-w-sm mt-6 flex gap-3">
        <button
          onClick={() => { setScreen("timetable"); setOyasumiDone(false); }}
          className={`flex-1 py-3 rounded-2xl border-2 font-mono text-sm transition active:translate-y-0.5 ${
            oyasumiDone
              ? "border-orange-300 bg-orange-50 text-orange-600 animate-pulse hover:border-orange-400"
              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:shadow-sm"
          }`}
        >
          📅 じかんわり
        </button>
        <button
          onClick={() => {
            if (!isHoliday) {
              showMessage("にっきは おやすみの ひに みれるよ");
              return;
            }
            setScreen("diary");
          }}
          className={`flex-1 py-3 rounded-2xl border-2 font-mono text-sm transition active:translate-y-0.5 ${
            isHoliday
              ? "border-yellow-200 bg-yellow-50 text-yellow-700 hover:border-yellow-300 hover:shadow-sm"
              : "border-gray-200 bg-gray-50 text-gray-400"
          }`}
        >
          📖 にっき {!isHoliday && "🔒"}
        </button>
      </div>

      {/* デモ操作パネル */}
      <div className="w-full max-w-sm mt-8">
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="w-full text-left font-mono text-xs text-gray-400 hover:text-gray-500 transition mb-2"
        >
          {showPanel ? "▼" : "▶"} デモ操作パネル
        </button>

        {showPanel && (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-4 flex flex-col gap-3">
            <p className="font-mono text-xs text-gray-400">
              ※ デモ用の操作ボタンです（本番版にはありません）
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={advanceDay}
                className="px-3 py-1.5 rounded-full border border-gray-300 bg-gray-50 text-gray-600 font-mono text-xs hover:bg-gray-100 transition active:translate-y-0.5"
              >
                📅 つぎの日へ
              </button>
              <button
                onClick={toggleHoliday}
                className={`px-3 py-1.5 rounded-full border font-mono text-xs transition active:translate-y-0.5 ${
                  isHoliday
                    ? "border-blue-400 bg-blue-100 text-blue-600"
                    : "border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100"
                }`}
              >
                {isHoliday ? "🔵 へいじつに もどす" : "🏖️ きゅうじつに してみる"}
              </button>
              <button
                onClick={skipLevel}
                className="px-3 py-1.5 rounded-full border border-green-300 bg-green-50 text-green-600 font-mono text-xs hover:bg-green-100 transition active:translate-y-0.5"
              >
                ⬆ レベルスキップ
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={triggerRunaway}
                className="px-3 py-1.5 rounded-full border border-red-300 bg-red-50 text-red-600 font-mono text-xs hover:bg-red-100 transition active:translate-y-0.5"
              >
                🏃 もし いえでしちゃったら……
              </button>
              <button
                onClick={resetAll}
                className="px-3 py-1.5 rounded-full border border-gray-300 bg-gray-50 text-gray-600 font-mono text-xs hover:bg-gray-100 transition active:translate-y-0.5"
              >
                🔄 リセット
              </button>
            </div>

            <div className="mt-1 font-mono text-xs text-gray-400 space-y-0.5">
              <p>なつきpt: {pet.natsuki_points} / Lv.{pet.natsuki_level}</p>
              <p>mood: {pet.mood} / status: {pet.status}</p>
              <p>にっき: {diaryEntries.length}けん</p>
            </div>
          </div>
        )}
      </div>

      {/* フッター */}
      <p className="mt-8 text-xs text-gray-300 font-mono text-center">
        データはブラウザのメモリ上のみ（リロードで初期化）
      </p>
    </div>
  );
}
