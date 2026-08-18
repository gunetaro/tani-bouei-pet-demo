"use client";

import type { DiaryEntry } from "@/lib/demo-data";

interface DiaryProps {
  entries: DiaryEntry[];
  onClose: () => void;
}

export default function Diary({ entries, onClose }: DiaryProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-[#F5F4EE] border-4 border-gray-500 rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col shadow-xl">
        {/* ヘッダー */}
        <div className="flex justify-between items-center px-4 py-3 border-b-2 border-gray-300">
          <span className="font-mono text-sm text-gray-600">おばけちゃんの にっき</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-mono text-lg transition"
          >
            x
          </button>
        </div>

        {/* 日記リスト */}
        <div className="overflow-y-auto p-4 space-y-4">
          {entries.length === 0 ? (
            <p className="font-mono text-xs text-gray-400 text-center py-8">
              まだ にっきは ないよ
            </p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.day}
                className="bg-white border-2 border-gray-300 rounded-xl p-3"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-xs text-gray-500">
                    {entry.day}にちめ - {entry.dayLabel}
                  </span>
                  <div className="flex gap-1">
                    {entry.cares.length > 0 ? (
                      entry.cares.map((c) => (
                        <span key={c} className="text-xs">
                          {c === "oyasumi" ? "🌙" : c === "ohayou" ? "☀️" : "🚶"}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-300">おやすみ</span>
                    )}
                  </div>
                </div>
                <div className="font-mono text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                  {entry.text}
                </div>
                <div className="mt-2 flex items-center gap-1">
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
    </div>
  );
}
