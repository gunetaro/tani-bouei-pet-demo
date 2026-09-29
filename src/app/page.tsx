"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Live2DGhost, { type GhostApi } from "@/components/Live2DGhost";
import ObakePet, { type ObakePetHandle } from "@/components/ObakePet";
import type { ObakeState, ObakeMotion } from "@/lib/obake/obake-engine";
import Diary from "@/components/Diary";
import Timetable from "@/components/Timetable";
import {
  PET_WORDS,
  CARE_POINTS,
  NATSUKI_THRESHOLDS,
  getNatsukiLevel,
  OBAKE_PRESET_LARGE,
  type PetState,
  type PetStatus,
} from "@/lib/pet-constants";
import { DEMO_DIARY, type DiaryEntry } from "@/lib/demo-data";

/** true → 新しいおばけ Live2D 部品、false → 旧 pixi-live2d-display */
const USE_NEW_OBAKE = true;
/** true → デモ操作パネルを表示 */
const SHOW_DEMO_PANEL = true;

const OBAKE_STATE_LABELS: Record<string, string> = {
  idle: "ふつう",
  sleep: "ねてる",
  sulk: "すねてる",
  gone: "いえでちゅう",
};

function petStatusToObakeState(status: PetStatus, oyasumiDone: boolean): ObakeState {
  if (status === "runaway") return "gone";
  if (status === "sad" || status === "distant") return "sulk";
  if (oyasumiDone) return "sleep";
  return "idle";
}

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
  const [dayCount, setDayCount] = useState(8);
  const [isHoliday, setIsHoliday] = useState(false);
  const [obakeDisplayState, setObakeDisplayState] = useState("ふつう");
  const [demoAnimating, setDemoAnimating] = useState(false);
  const [oyasumiDone, setOyasumiDone] = useState(false);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([...DEMO_DIARY]);
  const ghostApiRef = useRef<GhostApi | null>(null);
  const obakeRef = useRef<ObakePetHandle>(null);
  const [mountObakeState] = useState<ObakeState>(() => {
    if (pet.status === "sad" || pet.status === "distant") return "idle";
    if (pet.status === "runaway") return "sulk";
    return petStatusToObakeState(pet.status, oyasumiDone);
  });
  const [sulkAnimShown, setSulkAnimShown] = useState(false);
  const [iedeAnimShown, setIedeAnimShown] = useState(false);

  // デモパネル B: モーション
  const [playingMotion, setPlayingMotion] = useState<ObakeMotion | null>(null);

  // デモパネル C: パラメータ
  const [showParams, setShowParams] = useState(false);
  const [paramValues, setParamValues] = useState<Record<string, number>>({});

  // パラメータの PARAM_INFO / MOTION_INFO（動的 import で取得）
  const [PARAM_INFO, setParamInfo] = useState<{ id: string; label: string; note?: string; min: number; max: number; def: number; group: string }[]>([]);
  const [MOTION_INFO, setMotionInfo] = useState<{ name: ObakeMotion; label: string }[]>([]);

  useEffect(() => {
    import("@/lib/obake/obake-engine").then(m => {
      setParamInfo(m.PARAM_INFO);
      setMotionInfo(m.MOTION_INFO);
    });
  }, []);

  // パラメータ値のポーリング（開いている間だけ）
  useEffect(() => {
    if (!showParams) return;
    const id = setInterval(() => {
      const vals = obakeRef.current?.getValues();
      if (vals) setParamValues(vals);
    }, 100);
    return () => clearInterval(id);
  }, [showParams]);

  const msgTimeout = useRef<NodeJS.Timeout>(null);

  const showMessage = useCallback((msg: string, duration = 2500) => {
    setMessage(msg);
    if (msgTimeout.current) clearTimeout(msgTimeout.current);
    msgTimeout.current = setTimeout(() => setMessage(""), duration);
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

      if (USE_NEW_OBAKE) {
        if (careType === "ohayou") {
          obakeRef.current?.ohayo();
          if (pet.status === "sad" || pet.status === "distant") {
            setSulkAnimShown(false);
            setIedeAnimShown(false);
          }
        } else if (careType === "osanpo") obakeRef.current?.touko();
        else if (careType === "oyasumi") obakeRef.current?.oyasumi();
      } else {
        if (careType === "ohayou") ghostApiRef.current?.triggerOhayou();
        else if (careType === "osanpo") ghostApiRef.current?.triggerJump();
        else if (careType === "oyasumi") ghostApiRef.current?.triggerOyasumi();
      }

      if (!USE_NEW_OBAKE) {
        const words = PET_WORDS[pet.natsuki_level] || PET_WORDS[1];
        showMessage(words[careType] || words.happy);
      }

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
    [pet, todayCare, isHoliday, showMessage]
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
        if (USE_NEW_OBAKE) {
          if (newStatus === "sad" && pet.status !== "sad") {
            if (!sulkAnimShown) {
              obakeRef.current?.sulk();
              setSulkAnimShown(true);
            } else {
              obakeRef.current?.setState("sulk");
            }
          } else if (obakeRef.current?.getState() === "sleep") {
            obakeRef.current?.setState("idle");
          }
        }
      } else {
        showMessage("あたらしい いちにちが はじまった！");
        if (USE_NEW_OBAKE && obakeRef.current?.getState() === "sleep") {
          obakeRef.current?.setState("idle");
        }
      }
    } else {
      showMessage("あたらしい いちにちが はじまった！");
      if (USE_NEW_OBAKE && obakeRef.current?.getState() === "sleep") {
        obakeRef.current?.setState("idle");
      }
    }
    setIsHoliday(false);
  };

  const triggerRunaway = () => {
    if (USE_NEW_OBAKE) {
      obakeRef.current?.setState("sulk");
      obakeRef.current?.iede();
      setIedeAnimShown(true);
    } else {
      setPet((p) => ({ ...p, status: "runaway", mood: 0 }));
      showMessage("……いなくなっちゃった");
    }
  };

  const triggerReturn = () => {
    if (pet.status !== "runaway") return;
    if (USE_NEW_OBAKE) {
      obakeRef.current?.find();
      setSulkAnimShown(false);
      setIedeAnimShown(false);
    } else {
      setPet((p) => ({ ...p, status: "sad", mood: 20 }));
      const words = PET_WORDS[pet.natsuki_level] || PET_WORDS[1];
      showMessage(words.reunion);
      ghostApiRef.current?.triggerOhayou();
    }
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
    if (USE_NEW_OBAKE) {
      obakeRef.current?.ohayo();
    } else {
      ghostApiRef.current?.triggerOhayou();
    }
  };

  const resetAll = () => {
    setPet({ ...INITIAL_PET });
    setTodayCare({ oyasumi: false, ohayou: false, osanpo: false });
    setDayCount(8);
    setDiaryEntries([...DEMO_DIARY]);
    setIsHoliday(false);
    setOyasumiDone(false);
    showMessage("リセットしたよ！");
    if (USE_NEW_OBAKE) {
      obakeRef.current?.setState("idle");
      setSulkAnimShown(false);
      setIedeAnimShown(false);
    }
  };

  // --- デモパネル A: 放置操作 ---
  const demoSulk = () => {
    if (pet.status === "runaway" || demoAnimating) return;
    setPet((p) => ({ ...p, status: "sad", mood: 10 }));
    if (!sulkAnimShown) {
      setDemoAnimating(true);
      obakeRef.current?.sulk();
      setSulkAnimShown(true);
    } else {
      obakeRef.current?.setState("sulk");
    }
  };

  const demoIede = () => {
    if (pet.status === "runaway" || demoAnimating) return;
    if (!iedeAnimShown) {
      setDemoAnimating(true);
      obakeRef.current?.setState("sulk");
      obakeRef.current?.iede();
      setIedeAnimShown(true);
    } else {
      obakeRef.current?.setState("gone");
      setPet((p) => ({ ...p, status: "runaway", mood: 0 }));
    }
  };

  const demoFind = () => {
    if (pet.status !== "runaway" || demoAnimating) return;
    setDemoAnimating(true);
    obakeRef.current?.find();
    setSulkAnimShown(false);
    setIedeAnimShown(false);
  };

  const demoReset = () => {
    setPet({ ...INITIAL_PET });
    obakeRef.current?.setState("idle");
    setSulkAnimShown(false);
    setIedeAnimShown(false);
    setDemoAnimating(false);
    setPlayingMotion(null);
  };

  // --- デモパネル B: モーション ---
  const demoPlayMotion = (name: ObakeMotion) => {
    if (pet.status === "runaway" || demoAnimating) return;
    const ok = obakeRef.current?.playDemo(name);
    if (ok) {
      setPlayingMotion(name);
      setDemoAnimating(true);
    }
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

  const modelParams = PARAM_INFO.filter(p => p.group === "model");
  const addedParams = PARAM_INFO.filter(p => p.group === "added");
  const isGone = pet.status === "runaway";

  // --- ホーム画面（常時マウント） ---
  const demoPanelDev = (
    <div className="border-2 border-dashed border-gray-300 rounded-2xl bg-white p-4 relative">
      <span className="absolute -top-2.5 right-3 bg-white px-1.5 text-[10px] text-gray-400 font-mono">デモ用</span>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <button onClick={advanceDay} className="px-3 py-1.5 rounded-full border border-gray-300 bg-gray-50 text-gray-600 font-mono text-xs hover:bg-gray-100 transition active:translate-y-0.5">📅 つぎの日へ</button>
          <button onClick={toggleHoliday} className={`px-3 py-1.5 rounded-full border font-mono text-xs transition active:translate-y-0.5 ${isHoliday ? "border-blue-400 bg-blue-100 text-blue-600" : "border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100"}`}>{isHoliday ? "🔵 へいじつに もどす" : "🏖️ きゅうじつに してみる"}</button>
          <button onClick={skipLevel} className="px-3 py-1.5 rounded-full border border-green-300 bg-green-50 text-green-600 font-mono text-xs hover:bg-green-100 transition active:translate-y-0.5">⬆ レベルスキップ</button>
          <button onClick={resetAll} className="px-3 py-1.5 rounded-full border border-gray-300 bg-gray-50 text-gray-600 font-mono text-xs hover:bg-gray-100 transition active:translate-y-0.5">🔄 リセット</button>
        </div>
        <div className="font-mono text-xs text-gray-400 space-y-0.5">
          <p>なつきpt: {pet.natsuki_points} / Lv.{pet.natsuki_level}</p>
          <p>mood: {pet.mood} / status: {pet.status}</p>
          <p>にっき: {diaryEntries.length}けん</p>
        </div>
      </div>
    </div>
  );

  const demoPanelA = (
    <div className="border-2 border-dashed border-gray-300 rounded-2xl bg-white p-4 relative">
      <span className="absolute -top-2.5 right-3 bg-white px-1.5 text-[10px] text-gray-400 font-mono">デモ用</span>
      <p className="font-mono text-sm text-gray-600 mb-0.5">デモ操作パネル</p>
      <p className="font-mono text-[11px] text-gray-400 mb-3">時間を進めて、放置したときの様子を試せます</p>
      <div className="flex gap-2">
        <button onClick={demoSulk} disabled={isGone || demoAnimating}
          className="flex-1 py-2.5 rounded-2xl border-2 font-mono transition active:translate-y-0.5 border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:shadow-sm disabled:opacity-40 disabled:pointer-events-none">
          <span className="block text-sm">1日ほうち</span>
          <span className="block text-[10px] text-gray-400">すねる</span>
        </button>
        <button onClick={demoIede} disabled={isGone || demoAnimating}
          className="flex-1 py-2.5 rounded-2xl border-2 font-mono transition active:translate-y-0.5 border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:shadow-sm disabled:opacity-40 disabled:pointer-events-none">
          <span className="block text-sm">3日ほうち</span>
          <span className="block text-[10px] text-gray-400">いえで</span>
        </button>
        <button onClick={demoFind} disabled={!isGone || demoAnimating}
          className="flex-1 py-2.5 rounded-2xl border-2 font-mono transition active:translate-y-0.5 border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:shadow-sm disabled:opacity-40 disabled:pointer-events-none">
          <span className="block text-sm">だいがくへ</span>
          <span className="block text-[10px] text-gray-400">みつける</span>
        </button>
      </div>
      <div className="flex items-end justify-between mt-3">
        <p className="font-mono text-[11px] text-gray-400">いまの状態：{obakeDisplayState}</p>
        <button onClick={demoReset} className="font-mono text-[11px] text-gray-400 hover:text-gray-600 transition underline">はじめにもどす</button>
      </div>
    </div>
  );

  return (
    <>
    {screen === "timetable" && (
      <div className="fixed inset-0 z-50 bg-[#F5F4EE] overflow-y-auto">
        <Timetable onClose={() => setScreen("home")} />
      </div>
    )}
    {screen === "diary" && (
      <div className="fixed inset-0 z-50 bg-[#F5F4EE] overflow-y-auto">
        <Diary entries={diaryEntries} onClose={() => setScreen("home")} />
      </div>
    )}
    <div className="min-h-screen bg-[#F5F4EE] flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-sm lg:max-w-6xl lg:flex lg:gap-5 lg:items-start lg:justify-center">
      {/* === 中央カラム：アプリ本体（モバイルでは最初、PCでは真ん中） === */}
      <div className="w-full max-w-sm flex flex-col items-center shrink-0 lg:order-2">
      {/* ヘッダー */}
      <div className="w-full flex justify-between items-center mb-4">
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
      <div className="w-full bg-[#C5CCA1] border-[6px] border-gray-500 rounded-2xl p-6 flex flex-col items-center relative shadow-lg">
        <div className="flex flex-col items-center gap-1 mb-2">
          <span className="text-xs text-gray-600 font-mono">
            きぶん: {moodEmoji}　{pet.consecutive_days}日れんぞく　({dayCount}日目)
          </span>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((i) => (
              <svg key={i} viewBox="0 0 16 14" className="w-4 h-3.5">
                <path
                  d="M8,3 C8,1 6.5,0 5,0 C3,0 1,1.5 1,4 C1,8 8,13 8,13 C8,13 15,8 15,4 C15,1.5 13,0 11,0 C9.5,0 8,1 8,3 Z"
                  fill={i <= pet.natsuki_level ? "#E24B4A" : "#D3D1C7"}
                />
              </svg>
            ))}
          </div>
        </div>

        {USE_NEW_OBAKE ? (
          <div className="w-full aspect-[642/472] relative">
            <ObakePet
              ref={obakeRef}
              preset={OBAKE_PRESET_LARGE}
              initialState={mountObakeState}
              bubble={false}
              onSay={(text, dur) => showMessage(text, dur * 1000)}
              onReady={() => {
                if (pet.status === "sad" && !sulkAnimShown) {
                  obakeRef.current?.sulk();
                  setSulkAnimShown(true);
                } else if (pet.status === "runaway" && !iedeAnimShown) {
                  obakeRef.current?.iede();
                  setIedeAnimShown(true);
                }
              }}
              onStateChange={(s) => {
                setObakeDisplayState(OBAKE_STATE_LABELS[s] || s);
                if (s === "gone") {
                  setPet((p) => ({ ...p, status: "runaway", mood: 0 }));
                } else if (s === "idle" && pet.status === "runaway") {
                  setPet((p) => ({ ...p, status: "normal", mood: 20 }));
                }
              }}
              onMotionEnd={() => { setDemoAnimating(false); setPlayingMotion(null); }}
            />
          </div>
        ) : (
          <div className="w-44 h-44 relative overflow-hidden">
            <Live2DGhost
              status={pet.status}
              mood={pet.mood}
              natsukiLevel={pet.natsuki_level}
              onModelReady={(api) => { ghostApiRef.current = api; }}
            />
            <div
              className={`absolute inset-0 bg-[#C5CCA1] flex flex-col items-center justify-center transition-opacity duration-500 ${
                pet.status === "runaway" ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <p className="font-mono text-sm text-gray-400">……いない</p>
              <div className="flex gap-2 mt-2 opacity-30">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                <div className="w-1 h-1 rounded-full bg-gray-300 mt-1" />
                <div className="w-1 h-1 rounded-full bg-gray-200 mt-0.5" />
              </div>
            </div>
          </div>
        )}

        {message && (
          <div className="mt-2 bg-white border-2 border-gray-500 rounded-xl px-3 py-1.5 text-sm font-mono text-gray-700 animate-fade-in max-w-[240px] text-center">
            {message}
          </div>
        )}
      </div>

      {/* お世話ボタン */}
      {!isGone && !isHoliday && (
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
              className={`px-3 py-2.5 rounded-full border-2 font-mono text-sm whitespace-nowrap transition-all duration-200 ${
                todayCare[type]
                  ? "border-green-300 bg-green-50 text-green-600"
                  : "border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:shadow-sm active:translate-y-0.5"
              } disabled:cursor-default`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {isHoliday && !isGone && (
        <p className="mt-5 font-mono text-sm text-gray-400">きょうは おやすみ。のんびりしよう。</p>
      )}

      {isGone && (
        <button
          onClick={triggerReturn}
          className="mt-5 px-5 py-2.5 rounded-full border-2 border-dashed border-gray-400 bg-white text-gray-500 font-mono text-sm hover:border-gray-500 transition-all duration-200 active:translate-y-0.5"
        >
          おうちに もどす
        </button>
      )}

      {/* なつきプログレスバー（PCのみ） */}
      <div className="w-full mt-6 hidden lg:block">
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
                pet.natsuki_level >= 3 ? "#7F77DD" : pet.natsuki_level >= 2 ? "#5DCAA5" : "#85B7EB",
            }}
          />
        </div>
      </div>

      {/* ナビゲーション */}
      <div className="w-full mt-6 flex gap-3">
        <button
          onClick={() => {
            setScreen("timetable");
            setOyasumiDone(false);
            if (USE_NEW_OBAKE && obakeRef.current?.getState() === "sleep") {
              obakeRef.current?.setState("idle");
            }
          }}
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
            if (!isHoliday) { showMessage("にっきは おやすみの ひに みれるよ"); return; }
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

      {/* モバイル用：デモ操作パネル（PCでは左カラムに表示） */}
      {SHOW_DEMO_PANEL && (
        <div className="w-full mt-5 lg:hidden flex flex-col gap-4">
          {demoPanelDev}
          {demoPanelA}
        </div>
      )}

      {/* 遊び方の説明 */}
      <div className="w-full mt-4 bg-gray-100 rounded-xl px-3 py-2.5 font-mono text-[11px] text-gray-500 leading-relaxed">
        <span className="inline sm:hidden">
          <b>なでる</b>：あたまをこすこす<br />
          <b>つつく</b>：からだをタップ<br />
          <b>くすぐる</b>：すそをタップ<br />
          <b>てをタップ</b>：タップした手をふる<br />
        </span>
        <span className="hidden sm:inline">
          <b>なでる</b>：あたまをこすこす　<b>つつく</b>：からだをタップ<br />
          <b>くすぐる</b>：すそをタップ　<b>てをタップ</b>：タップした手をふる<br />
        </span>
        すねたら「おはよう」で仲直り。いえでしたら、だいがくへ行くと見つかります。
      </div>

      <p className="mt-4 text-xs text-gray-300 font-mono text-center">
        データはブラウザのメモリ上のみ（リロードで初期化）
      </p>

      </div>{/* /中央カラム */}

      {/* === 左カラム：デモ操作パネル（モバイルでは中央の下、PCでは左） === */}
      {SHOW_DEMO_PANEL && (
      <div className="hidden lg:flex w-full max-w-xs mt-0 flex-col gap-4 lg:order-1">

        {/* A: 放置の操作（PC用） */}
        {demoPanelA}

        {/* B: モーション */}
        <div className="border-2 border-dashed border-gray-300 rounded-2xl bg-white p-4 relative">
          <span className="absolute -top-2.5 right-3 bg-white px-1.5 text-[10px] text-gray-400 font-mono">デモ用</span>
          <p className="font-mono text-sm text-gray-600 mb-2">モーション</p>
          <div className="flex flex-wrap gap-1.5">
            {MOTION_INFO.map(({ name, label }) => (
              <button
                key={name}
                onClick={() => demoPlayMotion(name)}
                disabled={isGone || demoAnimating}
                className={`px-2.5 py-1 rounded-full border font-mono text-xs transition active:translate-y-0.5 ${
                  playingMotion === name
                    ? "border-gray-600 bg-gray-600 text-white"
                    : "border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100"
                } disabled:opacity-40 disabled:pointer-events-none`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* つぎの日へ等（PC用） */}
        {demoPanelDev}

      </div>
      )}

      {/* === 右カラム：パラメータ（モバイルでは一番下、PCでは右） === */}
      {SHOW_DEMO_PANEL && (
      <div className="w-full max-w-sm lg:max-w-xs mt-6 lg:mt-0 lg:order-3">
        <div className="@container border-2 border-dashed border-gray-300 rounded-2xl bg-white p-4 relative">
          <span className="absolute -top-2.5 right-3 bg-white px-1.5 text-[10px] text-gray-400 font-mono">開発用</span>
          <button
            onClick={() => setShowParams(!showParams)}
            className="w-full text-left font-mono text-sm text-gray-600 hover:text-gray-800 transition"
          >
            {showParams ? "▼" : "▶"} パラメータを{showParams ? "隠す" : "表示"}
          </button>

          {showParams && (
            <div className="mt-3 space-y-4">
              {[
                { title: "モデルのパラメータ", items: modelParams },
                { title: "追加したパラメータ", items: addedParams },
              ].map(({ title, items }) => (
                <div key={title}>
                  <p className="font-mono text-[11px] text-gray-400 mb-1.5">{title}</p>
                  <div className="grid grid-cols-1 gap-y-1.5">
                    {items.map((p) => {
                      const val = paramValues[p.id] ?? p.def;
                      const step = (p.max - p.min) / 200;
                      return (
                        <div key={p.id} className="min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-0.5">
                            <span className="font-mono text-[11px] text-gray-500">
                              {p.label}
                              {p.note && <span className="text-[9px] text-gray-400 ml-1">({p.note})</span>}
                            </span>
                            <span className="font-mono text-[10px] text-gray-400 tabular-nums text-right shrink-0 w-10">
                              {val.toFixed(1)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={p.min}
                            max={p.max}
                            step={step}
                            value={val}
                            readOnly
                            className="w-full h-1.5 accent-gray-400 pointer-events-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <p className="font-mono text-[10px] text-gray-400">
                おばけの内部パラメータをリアルタイムで表示しています。
              </p>
            </div>
          )}
        </div>
      </div>
      )}

      </div>{/* /3カラムコンテナ */}
    </div>
    </>
  );
}
