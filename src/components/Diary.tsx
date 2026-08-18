"use client";

import type { DiaryEntry } from "@/lib/demo-data";

interface DiaryProps {
  entries: DiaryEntry[];
  onClose: () => void;
}

export default function Diary({ entries, onClose }: DiaryProps) {
  return (
    <div className="min-h-screen bg-[#F5F4EE] flex flex-col px-4 py-6">
      {/* ヘッダー */}
      <div className="w-full max-w-sm mx-auto flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <span className="text-lg">📖</span>
          <span className="font-mono text-lg text-gray-700">おばけちゃんの にっき</span>
        </div>
        <button
          onClick={onClose}
          className="font-mono text-sm text-gray-400 hover:text-gray-600 transition"
        >
          ← ホームへ
        </button>
      </div>

      {/* 日記リスト */}
      <div className="w-full max-w-sm mx-auto space-y-4">
        {entries.length === 0 ? (
          <p className="font-mono text-xs text-gray-400 text-center py-8">
            まだ にっきは ないよ
          </p>
        ) : (
          [...entries].reverse().map((entry) => (
            <div
              key={entry.day}
              className="bg-white border border-gray-200 rounded-2xl p-4"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="font-mono text-sm text-gray-500">
                  {entry.day}にちめ — {entry.dayLabel}
                </span>
                <div className="flex gap-1">
                  {entry.cares.length > 0 ? (
                    entry.cares.map((c) => (
                      <span key={c} className="text-sm">
                        {c === "oyasumi" ? "🌙" : c === "ohayou" ? "☀️" : "🚶"}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-300 font-mono">おやすみ</span>
                  )}
                </div>
              </div>
              <div className="font-mono text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {entry.text}
              </div>
              <div className="mt-3 flex items-center gap-1">
                {[1, 2, 3].map((i) => (
                  <svg
                    key={i}
                    viewBox="0 0 9 8"
                    className="w-3 h-2.5"
                    style={{ imageRendering: "pixelated" }}
                  >
                    <rect x="1" y="0" width="2" height="1" fill={i <= entry.natsukiLevel ? "#E24B4A" : "#D3D1C7"} />
                    <rect x="5" y="0" width="2" height="1" fill={i <= entry.natsukiLevel ? "#E24B4A" : "#D3D1C7"} />
                    <rect x="0" y="1" width="4" height="1" fill={i <= entry.natsukiLevel ? "#E24B4A" : "#D3D1C7"} />
                    <rect x="4" y="1" width="4" height="1" fill={i <= entry.natsukiLevel ? "#E24B4A" : "#D3D1C7"} />
                    <rect x="0" y="2" width="8" height="1" fill={i <= entry.natsukiLevel ? "#F09595" : "#D3D1C7"} />
                    <rect x="1" y="3" width="6" height="1" fill={i <= entry.natsukiLevel ? "#E24B4A" : "#D3D1C7"} />
                    <rect x="2" y="4" width="4" height="1" fill={i <= entry.natsukiLevel ? "#E24B4A" : "#D3D1C7"} />
                    <rect x="3" y="5" width="2" height="1" fill={i <= entry.natsukiLevel ? "#E24B4A" : "#D3D1C7"} />
                  </svg>
                ))}
                <span className="font-mono text-xs text-gray-400 ml-1">
                  Lv.{entry.natsukiLevel}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
