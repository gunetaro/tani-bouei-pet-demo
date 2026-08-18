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
  const [breathScale, setBreathScale] = useState(1);
  const [tailPhase, setTailPhase] = useState(0);
  const [sparkle, setSparkle] = useState(false);

  useEffect(() => {
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      // 呼吸アニメーション（ゆっくり膨らむ・縮む）
      const t = frame * 0.08;
      setBreathScale(1 + Math.sin(t) * 0.02);
      // 裾のゆらゆら
      setTailPhase(t);
      // Lv.3キラキラ
      if (frame % 12 === 0) setSparkle((s) => !s);
    }, 60);
    return () => clearInterval(interval);
  }, []);

  // 家出状態
  if (status === "runaway") {
    return (
      <svg viewBox="0 0 120 100" className="w-44 h-36">
        <text x="60" y="40" textAnchor="middle" fontSize="14" fill="#999" fontFamily="monospace">
          ……いない
        </text>
        {/* 足あと */}
        <circle cx="45" cy="65" r="2" fill="#D3D1C7" opacity="0.3" />
        <circle cx="55" cy="70" r="1.5" fill="#D3D1C7" opacity="0.2" />
        <circle cx="65" cy="68" r="1" fill="#D3D1C7" opacity="0.15" />
      </svg>
    );
  }

  const ghostColor = status === "distant" ? "#C8C6BD" : status === "sad" ? "#DDDBD2" : "#FFFFFF";
  const ghostX = status === "distant" ? 25 : 0;
  const scale = natsukiLevel >= 3 ? 1.05 : natsukiLevel >= 2 ? 1.0 : 0.95;

  // 裾の波打ちオフセット
  const w1 = Math.sin(tailPhase) * 3;
  const w2 = Math.sin(tailPhase + 2) * 3;
  const w3 = Math.sin(tailPhase + 4) * 3;

  // おばけの本体パス（丸い頭 + 左右の手 + 波打つ裾）
  const bodyPath = `
    M 60 20
    C 38 20, 22 38, 22 52
    C 22 58, 18 62, 12 66
    C 16 68, 22 64, 26 60
    C 26 68, 28 78, ${30 + w1} ${82 + w1}
    C ${34 + w1} ${78 - w1}, 40 76, 46 ${80 + w2}
    C 50 ${84 + w2}, 54 ${84 - w2}, 60 ${80 - w2}
    C 66 ${76 + w2}, 70 ${78 + w3}, 74 ${82 + w3}
    C ${76 - w3} ${78 - w3}, 80 76, 84 ${80 - w1}
    C 88 76, 94 68, 94 60
    C 98 64, 104 68, 108 66
    C 102 62, 98 58, 98 52
    C 98 38, 82 20, 60 20
    Z
  `;

  // 表情パーツ
  const getFace = () => {
    // うれしい（^_^ 目 + ω口）
    if (isHappy) {
      return (
        <>
          {/* にっこり目 */}
          <path d="M 44 46 Q 47 42 50 46" stroke="#2C2C2A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 70 46 Q 73 42 76 46" stroke="#2C2C2A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* ω口 */}
          <path d="M 54 56 Q 57 61 60 57 Q 63 61 66 56" stroke="#2C2C2A" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* ほっぺ */}
          <circle cx="42" cy="54" r="4" fill="#FFD4D4" opacity="0.5" />
          <circle cx="78" cy="54" r="4" fill="#FFD4D4" opacity="0.5" />
        </>
      );
    }
    // 距離を取ってる
    if (status === "distant") {
      return (
        <>
          <circle cx="48" cy="46" r="3" fill="#2C2C2A" />
          <circle cx="72" cy="46" r="3" fill="#2C2C2A" />
          <path d="M 55 58 L 65 58" stroke="#2C2C2A" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    }
    // さみしい
    if (status === "sad" || mood < 30) {
      return (
        <>
          <circle cx="48" cy="48" r="3" fill="#2C2C2A" />
          <circle cx="72" cy="48" r="3" fill="#2C2C2A" />
          <path d="M 54 60 Q 60 56 66 60" stroke="#2C2C2A" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      );
    }
    // ごきげん（mood高い）
    if (mood > 70) {
      return (
        <>
          <circle cx="48" cy="46" r="3.5" fill="#2C2C2A" />
          <circle cx="72" cy="46" r="3.5" fill="#2C2C2A" />
          {/* ω口 */}
          <path d="M 54 56 Q 57 60 60 57 Q 63 60 66 56" stroke="#2C2C2A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          {/* ほんのりほっぺ */}
          <circle cx="42" cy="54" r="3.5" fill="#FFD4D4" opacity="0.35" />
          <circle cx="78" cy="54" r="3.5" fill="#FFD4D4" opacity="0.35" />
        </>
      );
    }
    // 通常（丸目 + ω口）
    return (
      <>
        <circle cx="48" cy="46" r="3" fill="#2C2C2A" />
        <circle cx="72" cy="46" r="3" fill="#2C2C2A" />
        <path d="M 55 56 Q 58 59 60 57 Q 62 59 65 56" stroke="#2C2C2A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </>
    );
  };

  return (
    <svg viewBox="0 0 120 100" className="w-44 h-36">
      <g
        transform={`translate(${ghostX}, 0) scale(${scale * breathScale})`}
        style={{ transformOrigin: "60px 50px", transition: "transform 0.3s ease" }}
      >
        {/* 影 */}
        <ellipse cx="60" cy="90" rx="28" ry="5" fill="#B8BF96" opacity="0.3" />

        {/* 本体 */}
        <path d={bodyPath} fill={ghostColor} stroke="none" />
        {/* ほんのり影（立体感） */}
        <path d={bodyPath} fill="url(#ghostShading)" />

        {/* 表情 */}
        {getFace()}

        {/* Lv.3 キラキラ */}
        {natsukiLevel >= 3 && (
          <>
            <text
              x="92"
              y="28"
              fontSize="10"
              opacity={sparkle ? 0.8 : 0.3}
              style={{ transition: "opacity 0.5s" }}
            >
              ✦
            </text>
            <text
              x="22"
              y="35"
              fontSize="7"
              opacity={sparkle ? 0.3 : 0.7}
              style={{ transition: "opacity 0.5s" }}
            >
              ✦
            </text>
          </>
        )}
      </g>

      {/* グラデーション定義 */}
      <defs>
        <radialGradient id="ghostShading" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="white" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.04" />
        </radialGradient>
      </defs>
    </svg>
  );
}
