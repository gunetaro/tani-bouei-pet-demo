"use client";

import { useState } from "react";
import { DEMO_TIMETABLE, DAY_LABELS, type DayKey } from "@/lib/demo-data";

interface TimetableProps {
  onClose: () => void;
}

const DAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri"];

export default function Timetable({ onClose }: TimetableProps) {
  const [selectedDay, setSelectedDay] = useState<DayKey>("mon");
  const entries = DEMO_TIMETABLE[selectedDay];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-[#F5F4EE] border-4 border-gray-500 rounded-2xl w-full max-w-sm shadow-xl">
        {/* ヘッダー */}
        <div className="flex justify-between items-center px-4 py-3 border-b-2 border-gray-300">
          <span className="font-mono text-sm text-gray-600">じかんわり</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-mono text-lg transition"
          >
            x
          </button>
        </div>

        {/* 曜日タブ */}
        <div className="flex border-b border-gray-200">
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-1 py-2 font-mono text-sm transition ${
                selectedDay === day
                  ? "text-gray-700 border-b-2 border-gray-500 bg-white"
                  : "text-gray-400 hover:text-gray-500"
              }`}
            >
              {DAY_LABELS[day]}
            </button>
          ))}
        </div>

        {/* 時間割 */}
        <div className="p-4 space-y-2">
          {entries.length === 0 ? (
            <p className="font-mono text-xs text-gray-400 text-center py-6">
              きょうは じゅぎょうが ないよ
            </p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.period}
                className="bg-white border-2 border-gray-300 rounded-xl px-4 py-3 flex justify-between items-center"
              >
                <div>
                  <span className="font-mono text-xs text-gray-400">
                    {entry.periodLabel}
                  </span>
                  <p className="font-mono text-sm text-gray-700 mt-0.5">
                    {entry.subject}
                  </p>
                </div>
                <span className="font-mono text-xs text-gray-400">
                  {entry.startTime}〜
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
