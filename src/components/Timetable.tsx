"use client";

import { useState } from "react";
import { DEMO_TIMETABLE, DAY_LABELS, type DayKey } from "@/lib/demo-data";

interface TimetableProps {
  onClose: () => void;
}

const DAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri"];
const FULL_DAY_NAMES: Record<DayKey, string> = {
  mon: "げつようび",
  tue: "かようび",
  wed: "すいようび",
  thu: "もくようび",
  fri: "きんようび",
};

const ALL_PERIODS = [
  { period: 1, label: "1げんめ", time: "9:00" },
  { period: 2, label: "2げんめ", time: "10:40" },
  { period: 3, label: "3げんめ", time: "13:00" },
  { period: 4, label: "4げんめ", time: "14:40" },
  { period: 5, label: "5げんめ", time: "16:15" },
];

export default function Timetable({ onClose }: TimetableProps) {
  const [selectedDay, setSelectedDay] = useState<DayKey>("mon");
  const entries = DEMO_TIMETABLE[selectedDay];

  const getSubject = (period: number) => {
    const entry = entries.find((e) => e.period === period);
    return entry?.subject || "";
  };

  return (
    <div className="min-h-screen bg-[#F5F4EE] flex flex-col px-4 py-6">
      {/* ヘッダー */}
      <div className="w-full max-w-sm mx-auto flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <span className="text-lg">📅</span>
          <span className="font-mono text-lg text-gray-700">じかんわり</span>
        </div>
        <button
          onClick={onClose}
          className="font-mono text-sm text-gray-400 hover:text-gray-600 transition"
        >
          ← ホームへ
        </button>
      </div>

      {/* 曜日タブ */}
      <div className="w-full max-w-sm mx-auto flex gap-2 mb-4">
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`flex-1 py-2 rounded-full font-mono text-sm transition ${
              selectedDay === day
                ? "bg-gray-500 text-white"
                : "bg-white border border-gray-300 text-gray-500 hover:border-gray-400"
            }`}
          >
            {DAY_LABELS[day]}
          </button>
        ))}
      </div>

      {/* 時間割テーブル */}
      <div className="w-full max-w-sm mx-auto bg-white border border-gray-200 rounded-2xl p-5">
        <p className="font-mono text-sm text-gray-500 mb-4">{FULL_DAY_NAMES[selectedDay]}</p>

        <div className="space-y-3">
          {ALL_PERIODS.map(({ period, label, time }) => (
            <div key={period} className="flex items-center gap-3">
              <span className="font-mono text-sm text-gray-500 w-28 shrink-0">
                {label}（{time}）
              </span>
              <div className="flex-1 border-b border-gray-200 pb-1">
                <span className="font-mono text-sm text-gray-700">
                  {getSubject(period)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-5">
          <span className="px-4 py-1.5 rounded-full border border-gray-300 font-mono text-xs text-gray-400">
            ほぞんする
          </span>
        </div>
      </div>

      {/* 大学の場所（デモ表示のみ） */}
      <div className="w-full max-w-sm mx-auto bg-white border border-gray-200 rounded-2xl p-5 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm">🏫</span>
          <span className="font-mono text-sm text-gray-600">だいがくの ばしょ</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-gray-400 w-12">なまえ</span>
            <span className="font-mono text-sm text-gray-700">電気通信大学</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-gray-400 w-12">いち</span>
            <span className="font-mono text-sm text-gray-500">35.6565, 139.5425</span>
            <span className="px-3 py-1 rounded-full border border-gray-300 font-mono text-xs text-gray-400">
              現在地を取得
            </span>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <span className="px-4 py-1.5 rounded-full border border-gray-300 font-mono text-xs text-gray-400">
            ほぞんする
          </span>
        </div>
      </div>
    </div>
  );
}
