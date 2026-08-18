"use client";

import { useEffect, useState } from "react";
import type { PetStatus } from "@/lib/pet-constants";

interface GhostProps {
  status: PetStatus;
  mood: number;
  natsukiLevel: number;
  isHappy?: boolean;
}

// 48x48ピクセルグリッドで参考画像を精密トレス
// 参考画像の特徴：
// - 頭部は大きく丸い（ほぼ円形、やや横長）
// - 顔のパーツは中央よりやや下、やや右寄り
// - 左目は右目より少し上で少し小さい
// - ω口は左目と右目の間のやや下
// - 左右の手は小さく斜め下にちょこんと出る（左手の方がやや大きく広がる）
// - 裾は大きく3つの波で広がる（左の波がいちばん大きい）
// - 全体的にずんぐり丸い、縦より横のほうがやや広い

// ピクセルデータ：各行 [y, x, width]
const BODY: [number, number, number][] = [
  // === 頭頂部 ===
  [6, 18, 12],
  [7, 15, 18],
  [8, 13, 22],
  [9, 12, 24],
  [10, 11, 26],
  [11, 10, 28],
  [12, 9, 30],
  [13, 9, 30],
  [14, 8, 32],
  [15, 8, 32],
  [16, 8, 32],
  // === 顔の領域 ===
  [17, 8, 32],
  [18, 8, 32],
  [19, 8, 32],
  [20, 8, 32],
  [21, 8, 32],
  [22, 8, 32],
  [23, 8, 32],
  [24, 8, 32],
  // === 胴体 ===
  [25, 8, 32],
  [26, 8, 32],
  [27, 7, 34],
  // === 手が出る部分（左手が大きく広がる） ===
  [28, 6, 36],
  [29, 5, 38],
  [30, 4, 40],
  [31, 3, 42],
  [32, 4, 40],
  [33, 5, 38],
  [34, 6, 36],
  [35, 7, 34],
  // === 裾への移行 ===
  [36, 7, 34],
  [37, 8, 32],
  [38, 8, 32],
  // === 裾（3つの波：左が大きい、中央、右） ===
  // 左の波
  [39, 8, 10], [39, 20, 8], [39, 30, 10],
  [40, 8, 9],  [40, 21, 6], [40, 31, 9],
  [41, 9, 7],  [41, 22, 4], [41, 32, 7],
  [42, 10, 5], [42, 23, 2], [42, 33, 5],
  [43, 11, 3],              [43, 34, 3],
  [44, 12, 2],              [44, 35, 2],
];

function BodyPixels({ color }: { color: string }) {
  return (
    <>
      {BODY.map(([y, x, w], i) => (
        <rect key={i} x={x} y={y} width={w} height={1} fill={color} />
      ))}
    </>
  );
}

// === 表情パーツ ===

// 通常顔：小さい丸目（左が少し上・少し小さい）+ ω口
function NormalFace() {
  return (
    <>
      {/* 左目（やや小さめ、やや上） */}
      <rect x={19} y={18} width={1} height={1} fill="#2C2C2A" />
      <rect x={18} y={19} width={3} height={2} fill="#2C2C2A" />
      <rect x={19} y={21} width={1} height={1} fill="#2C2C2A" />
      {/* 右目（やや大きめ、やや下） */}
      <rect x={28} y={19} width={1} height={1} fill="#2C2C2A" />
      <rect x={27} y={20} width={3} height={2} fill="#2C2C2A" />
      <rect x={28} y={22} width={1} height={1} fill="#2C2C2A" />
      {/* ω口 */}
      <rect x={22} y={25} width={1} height={1} fill="#2C2C2A" />
      <rect x={23} y={26} width={2} height={1} fill="#2C2C2A" />
      <rect x={25} y={25} width={1} height={1} fill="#2C2C2A" />
      <rect x={26} y={26} width={2} height={1} fill="#2C2C2A" />
      <rect x={28} y={25} width={1} height={1} fill="#2C2C2A" />
    </>
  );
}

// うれしい顔：^_^ 目 + ω口 + ほっぺ
function HappyFace() {
  return (
    <>
      {/* 左にっこり目 ^  */}
      <rect x={17} y={20} width={1} height={1} fill="#2C2C2A" />
      <rect x={18} y={19} width={1} height={1} fill="#2C2C2A" />
      <rect x={19} y={18} width={1} height={1} fill="#2C2C2A" />
      <rect x={20} y={19} width={1} height={1} fill="#2C2C2A" />
      <rect x={21} y={20} width={1} height={1} fill="#2C2C2A" />
      {/* 右にっこり目 ^  */}
      <rect x={26} y={21} width={1} height={1} fill="#2C2C2A" />
      <rect x={27} y={20} width={1} height={1} fill="#2C2C2A" />
      <rect x={28} y={19} width={1} height={1} fill="#2C2C2A" />
      <rect x={29} y={20} width={1} height={1} fill="#2C2C2A" />
      <rect x={30} y={21} width={1} height={1} fill="#2C2C2A" />
      {/* ω口 */}
      <rect x={22} y={25} width={1} height={1} fill="#2C2C2A" />
      <rect x={23} y={26} width={2} height={1} fill="#2C2C2A" />
      <rect x={25} y={25} width={1} height={1} fill="#2C2C2A" />
      <rect x={26} y={26} width={2} height={1} fill="#2C2C2A" />
      <rect x={28} y={25} width={1} height={1} fill="#2C2C2A" />
      {/* ほっぺ */}
      <rect x={15} y={23} width={3} height={2} fill="#FFB8C6" opacity={0.5} />
      <rect x={30} y={24} width={3} height={2} fill="#FFB8C6" opacity={0.5} />
    </>
  );
}

// さみしい顔
function SadFace() {
  return (
    <>
      {/* 左目 */}
      <rect x={18} y={20} width={3} height={2} fill="#2C2C2A" />
      {/* 右目 */}
      <rect x={27} y={21} width={3} height={2} fill="#2C2C2A" />
      {/* への字口 */}
      <rect x={23} y={27} width={1} height={1} fill="#2C2C2A" />
      <rect x={24} y={26} width={3} height={1} fill="#2C2C2A" />
      <rect x={27} y={27} width={1} height={1} fill="#2C2C2A" />
    </>
  );
}

// 距離をとってる顔
function DistantFace() {
  return (
    <>
      <rect x={18} y={20} width={3} height={2} fill="#2C2C2A" />
      <rect x={27} y={21} width={3} height={2} fill="#2C2C2A" />
      {/* 一文字口 */}
      <rect x={23} y={26} width={5} height={1} fill="#2C2C2A" />
    </>
  );
}

// ごきげん顔：丸目 + ω口 + ほんのりほっぺ
function GoodMoodFace() {
  return (
    <>
      {/* 左目 */}
      <rect x={19} y={18} width={1} height={1} fill="#2C2C2A" />
      <rect x={18} y={19} width={3} height={2} fill="#2C2C2A" />
      <rect x={19} y={21} width={1} height={1} fill="#2C2C2A" />
      {/* 右目 */}
      <rect x={28} y={19} width={1} height={1} fill="#2C2C2A" />
      <rect x={27} y={20} width={3} height={2} fill="#2C2C2A" />
      <rect x={28} y={22} width={1} height={1} fill="#2C2C2A" />
      {/* ω口 */}
      <rect x={22} y={25} width={1} height={1} fill="#2C2C2A" />
      <rect x={23} y={26} width={2} height={1} fill="#2C2C2A" />
      <rect x={25} y={25} width={1} height={1} fill="#2C2C2A" />
      <rect x={26} y={26} width={2} height={1} fill="#2C2C2A" />
      <rect x={28} y={25} width={1} height={1} fill="#2C2C2A" />
      {/* ほっぺ */}
      <rect x={15} y={23} width={3} height={2} fill="#FFB8C6" opacity={0.35} />
      <rect x={30} y={24} width={3} height={2} fill="#FFB8C6" opacity={0.35} />
    </>
  );
}

export default function Ghost({ status, mood, natsukiLevel, isHappy }: GhostProps) {
  const [bobY, setBobY] = useState(0);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % 60);
      setBobY((y) => (y === 0 ? -1 : 0));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  if (status === "runaway") {
    return (
      <svg viewBox="0 0 48 48" className="w-48 h-48" style={{ imageRendering: "pixelated" as const }}>
        <text x="24" y="18" textAnchor="middle" fontSize="4" fill="#999" fontFamily="monospace">
          ……いない
        </text>
        <rect x="16" y="26" width="1" height="1" fill="#D3D1C7" opacity="0.3" />
        <rect x="22" y="28" width="1" height="1" fill="#D3D1C7" opacity="0.2" />
        <rect x="28" y="27" width="1" height="1" fill="#D3D1C7" opacity="0.15" />
      </svg>
    );
  }

  const ghostColor = status === "distant" ? "#D5D3CA" : status === "sad" ? "#E5E3DA" : "#FEFEFE";
  const offsetX = status === "distant" ? 5 : 0;
  const s = natsukiLevel >= 3 ? 1.03 : natsukiLevel >= 2 ? 1.0 : 0.97;

  const getFace = () => {
    if (isHappy) return <HappyFace />;
    if (status === "distant") return <DistantFace />;
    if (status === "sad" || mood < 30) return <SadFace />;
    if (mood > 70) return <GoodMoodFace />;
    return <NormalFace />;
  };

  const sp1 = frame % 24 < 12 ? 0.8 : 0.15;
  const sp2 = frame % 24 < 12 ? 0.15 : 0.7;

  return (
    <svg viewBox="0 0 48 48" className="w-48 h-48" style={{ imageRendering: "pixelated" as const }}>
      <g
        transform={`translate(${offsetX}, ${bobY}) scale(${s})`}
        style={{ transformOrigin: "24px 24px" }}
      >
        {/* 影 */}
        <rect x={14} y={45} width={20} height={1} fill="#B8BF96" opacity={0.2} />
        <rect x={16} y={46} width={16} height={1} fill="#B8BF96" opacity={0.1} />

        {/* 本体 */}
        <BodyPixels color={ghostColor} />

        {/* 表情 */}
        {getFace()}

        {/* Lv.3 キラキラ */}
        {natsukiLevel >= 3 && (
          <>
            <rect x={40} y={8} width={1} height={3} fill="#FFD700" opacity={sp1} />
            <rect x={39} y={9} width={3} height={1} fill="#FFD700" opacity={sp1} />
            <rect x={5} y={12} width={1} height={2} fill="#FFD700" opacity={sp2} />
            <rect x={4} y={13} width={3} height={1} fill="#FFD700" opacity={sp2} />
          </>
        )}
      </g>
    </svg>
  );
}
