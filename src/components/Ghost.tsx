"use client";

import { useEffect, useState } from "react";
import type { PetStatus } from "@/lib/pet-constants";

interface GhostProps {
  status: PetStatus;
  mood: number;
  natsukiLevel: number;
  isHappy?: boolean;
}

export default function Ghost({ status, mood, natsukiLevel, isHappy }: GhostProps) {
  const [bobY, setBobY] = useState(0);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % 60);
      setBobY((prev) => (prev === 0 ? -4 : 0));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  // 家出
  if (status === "runaway") {
    return (
      <div className="w-44 h-44 flex flex-col items-center justify-center">
        <p className="font-mono text-sm text-gray-400">……いない</p>
        <div className="flex gap-2 mt-2 opacity-30">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          <div className="w-1 h-1 rounded-full bg-gray-300 mt-1" />
          <div className="w-1 h-1 rounded-full bg-gray-200 mt-0.5" />
        </div>
      </div>
    );
  }

  const scale = natsukiLevel >= 3 ? 1.05 : natsukiLevel >= 2 ? 1.0 : 0.95;
  const offsetX = status === "distant" ? 40 : 0;
  const opacity = status === "distant" ? 0.6 : status === "sad" ? 0.7 : 1;
  const sparkle1 = frame % 24 < 12 ? 0.8 : 0.15;
  const sparkle2 = frame % 24 < 12 ? 0.15 : 0.7;

  // 表情のSVGオーバーレイ（画像の上に重ねる）
  // 元画像の顔パーツ位置を基準にした相対座標
  const getFaceOverlay = () => {
    // 元画像には通常顔（丸目+ω口）が描かれているので、
    // 通常・ごきげんの場合はオーバーレイ不要
    if (!isHappy && status !== "distant" && status !== "sad" && mood >= 30) {
      return null; // 通常顔はそのまま
    }

    // 他の表情は白で元の顔を隠してから新しい顔を描画
    return (
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
        {/* 元の目と口を白で隠す */}
        <ellipse cx="105" cy="110" rx="32" ry="28" fill="#FEFEFE" />

        {isHappy ? (
          <>
            {/* にっこり ^_^ 目 */}
            <path d="M 82 105 Q 88 95 94 105" stroke="#2C2C2A" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 112 107 Q 118 97 124 107" stroke="#2C2C2A" strokeWidth="3" fill="none" strokeLinecap="round" />
            {/* ω口 */}
            <path d="M 95 120 Q 100 128 105 122 Q 110 128 115 120" stroke="#2C2C2A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        ) : status === "distant" ? (
          <>
            {/* ちいさい目 */}
            <circle cx="88" cy="102" r="4" fill="#2C2C2A" />
            <circle cx="118" cy="104" r="4" fill="#2C2C2A" />
            {/* 一文字口 */}
            <line x1="97" y1="122" x2="112" y2="122" stroke="#2C2C2A" strokeWidth="2.5" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* さみしい目 */}
            <circle cx="88" cy="104" r="4.5" fill="#2C2C2A" />
            <circle cx="118" cy="106" r="4.5" fill="#2C2C2A" />
            {/* への字口 */}
            <path d="M 97 124 Q 105 118 113 124" stroke="#2C2C2A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        )}
      </svg>
    );
  };

  return (
    <div
      className="relative w-44 h-44"
      style={{
        transform: `translateX(${offsetX}px) translateY(${bobY}px) scale(${scale})`,
        transition: "transform 0.4s ease",
      }}
    >
      {/* おばけ本体（元画像） */}
      <img
        src="/obake.png"
        alt="おばけちゃん"
        className="w-full h-full object-contain"
        style={{
          opacity,
          filter: status === "sad" ? "saturate(0.5) brightness(0.9)" : status === "distant" ? "saturate(0.3) brightness(0.85)" : "none",
        }}
        draggable={false}
      />

      {/* 表情オーバーレイ */}
      {getFaceOverlay()}

      {/* Lv.3 キラキラ */}
      {natsukiLevel >= 3 && (
        <>
          <div
            className="absolute -top-1 -right-1 text-yellow-400 text-lg"
            style={{ opacity: sparkle1, transition: "opacity 0.5s" }}
          >
            ✦
          </div>
          <div
            className="absolute top-4 -left-2 text-yellow-400 text-sm"
            style={{ opacity: sparkle2, transition: "opacity 0.5s" }}
          >
            ✦
          </div>
        </>
      )}
    </div>
  );
}
