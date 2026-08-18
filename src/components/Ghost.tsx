"use client";

import { useEffect, useState } from "react";
import type { PetStatus } from "@/lib/pet-constants";

interface GhostProps {
  status: PetStatus;
  mood: number;
  natsukiLevel: number;
  isHappy?: boolean;
}

// 1px = 1マスのピクセルアート
// 32x32グリッドで描画、viewBox="0 0 32 32"、imageRendering: pixelated
// 参考画像の特徴：丸い頭、ちょこんとした手、3つの波の裾、小さい丸目、ω口

// 本体のピクセル座標（行ごとに定義）
// 参考画像に忠実に：横長の丸い頭、左右に小さな手、裾は3つの波
const BODY_ROWS: [number, number, number][] = [
  // [y, xStart, width]
  // 頭頂部（丸い）
  [4, 12, 8],
  [5, 10, 12],
  [6, 9, 14],
  [7, 8, 16],
  [8, 7, 18],
  [9, 7, 18],
  [10, 6, 20],
  [11, 6, 20],
  // 目・口がある部分
  [12, 6, 20],
  [13, 6, 20],
  [14, 6, 20],
  [15, 6, 20],
  [16, 6, 20],
  // 手が出る部分
  [17, 5, 22],
  [18, 4, 24],
  [19, 5, 22],
  // 胴体下部
  [20, 6, 20],
  [21, 6, 20],
  [22, 7, 18],
  // 裾（3つの波）
  [23, 7, 4],   [23, 13, 6],  [23, 21, 4],
  [24, 7, 3],   [24, 14, 4],  [24, 22, 3],
  [25, 8, 2],   [25, 15, 2],  [25, 22, 2],
];

function BodyPixels({ color }: { color: string }) {
  return (
    <>
      {BODY_ROWS.map(([y, x, w], i) => (
        <rect key={i} x={x} y={y} width={w} height={1} fill={color} />
      ))}
    </>
  );
}

// 表情差分
function NormalFace() {
  // 小さい丸目（左がわずかに上）+ ω口
  return (
    <>
      {/* 左目 */}
      <rect x={12} y={12} width={2} height={2} fill="#2C2C2A" />
      {/* 右目 */}
      <rect x={18} y={12} width={2} height={2} fill="#2C2C2A" />
      {/* ω口 */}
      <rect x={14} y={16} width={1} height={1} fill="#2C2C2A" />
      <rect x={15} y={17} width={1} height={1} fill="#2C2C2A" />
      <rect x={16} y={16} width={1} height={1} fill="#2C2C2A" />
      <rect x={17} y={17} width={1} height={1} fill="#2C2C2A" />
      <rect x={18} y={16} width={1} height={1} fill="#2C2C2A" />
    </>
  );
}

function HappyFace() {
  // ^_^ 目 + ω口 + ほっぺ
  return (
    <>
      {/* にっこり左目 */}
      <rect x={11} y={13} width={1} height={1} fill="#2C2C2A" />
      <rect x={12} y={12} width={1} height={1} fill="#2C2C2A" />
      <rect x={13} y={13} width={1} height={1} fill="#2C2C2A" />
      {/* にっこり右目 */}
      <rect x={18} y={13} width={1} height={1} fill="#2C2C2A" />
      <rect x={19} y={12} width={1} height={1} fill="#2C2C2A" />
      <rect x={20} y={13} width={1} height={1} fill="#2C2C2A" />
      {/* ω口 */}
      <rect x={14} y={16} width={1} height={1} fill="#2C2C2A" />
      <rect x={15} y={17} width={1} height={1} fill="#2C2C2A" />
      <rect x={16} y={16} width={1} height={1} fill="#2C2C2A" />
      <rect x={17} y={17} width={1} height={1} fill="#2C2C2A" />
      <rect x={18} y={16} width={1} height={1} fill="#2C2C2A" />
      {/* ほっぺ */}
      <rect x={10} y={15} width={2} height={1} fill="#FFB8C6" opacity={0.6} />
      <rect x={20} y={15} width={2} height={1} fill="#FFB8C6" opacity={0.6} />
    </>
  );
}

function SadFace() {
  return (
    <>
      {/* 目 */}
      <rect x={12} y={13} width={2} height={2} fill="#2C2C2A" />
      <rect x={18} y={13} width={2} height={2} fill="#2C2C2A" />
      {/* への字口 */}
      <rect x={14} y={17} width={1} height={1} fill="#2C2C2A" />
      <rect x={15} y={18} width={2} height={1} fill="#2C2C2A" />
      <rect x={17} y={17} width={1} height={1} fill="#2C2C2A" />
    </>
  );
}

function DistantFace() {
  return (
    <>
      {/* 小さめの目 */}
      <rect x={12} y={13} width={2} height={2} fill="#2C2C2A" />
      <rect x={18} y={13} width={2} height={2} fill="#2C2C2A" />
      {/* 一文字口 */}
      <rect x={14} y={17} width={4} height={1} fill="#2C2C2A" />
    </>
  );
}

function GoodMoodFace() {
  // 丸目 + ω口 + ほんのりほっぺ
  return (
    <>
      <rect x={12} y={12} width={2} height={2} fill="#2C2C2A" />
      <rect x={18} y={12} width={2} height={2} fill="#2C2C2A" />
      {/* ω口 */}
      <rect x={14} y={16} width={1} height={1} fill="#2C2C2A" />
      <rect x={15} y={17} width={1} height={1} fill="#2C2C2A" />
      <rect x={16} y={16} width={1} height={1} fill="#2C2C2A" />
      <rect x={17} y={17} width={1} height={1} fill="#2C2C2A" />
      <rect x={18} y={16} width={1} height={1} fill="#2C2C2A" />
      {/* ほっぺ */}
      <rect x={10} y={15} width={2} height={1} fill="#FFB8C6" opacity={0.4} />
      <rect x={20} y={15} width={2} height={1} fill="#FFB8C6" opacity={0.4} />
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
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // 家出
  if (status === "runaway") {
    return (
      <svg viewBox="0 0 32 32" className="w-44 h-44" style={{ imageRendering: "pixelated" as const }}>
        <text x="16" y="12" textAnchor="middle" fontSize="3" fill="#999" fontFamily="monospace">
          ……いない
        </text>
        <rect x="12" y="18" width="1" height="1" fill="#D3D1C7" opacity="0.3" />
        <rect x="16" y="20" width="1" height="1" fill="#D3D1C7" opacity="0.2" />
        <rect x="19" y="19" width="1" height="1" fill="#D3D1C7" opacity="0.15" />
      </svg>
    );
  }

  const ghostColor = status === "distant" ? "#C8C6BD" : status === "sad" ? "#DDDBD2" : "#FAFAF6";
  const outlineColor = status === "distant" ? "#A8A69D" : status === "sad" ? "#C5C3BA" : "#E8E6DD";
  const offsetX = status === "distant" ? 4 : 0;
  const s = natsukiLevel >= 3 ? 1.03 : natsukiLevel >= 2 ? 1.0 : 0.97;

  const getFace = () => {
    if (isHappy) return <HappyFace />;
    if (status === "distant") return <DistantFace />;
    if (status === "sad" || mood < 30) return <SadFace />;
    if (mood > 70) return <GoodMoodFace />;
    return <NormalFace />;
  };

  // Lv.3 キラキラ（ピクセルの十字型）
  const sparkleOpacity1 = frame % 20 < 10 ? 0.8 : 0.2;
  const sparkleOpacity2 = frame % 20 < 10 ? 0.2 : 0.7;

  return (
    <svg viewBox="0 0 32 32" className="w-44 h-44" style={{ imageRendering: "pixelated" as const }}>
      <g
        transform={`translate(${offsetX}, ${bobY}) scale(${s})`}
        style={{ transformOrigin: "16px 16px" }}
      >
        {/* 影 */}
        <rect x={10} y={27} width={12} height={1} fill="#B8BF96" opacity={0.25} />
        <rect x={11} y={28} width={10} height={1} fill="#B8BF96" opacity={0.15} />

        {/* アウトライン（1px外側に薄い色） */}
        <BodyPixels color={outlineColor} />
        {/* 本体を1ピクセル内側にずらさず上に重ねる（アウトラインの上に本体色） */}
        <BodyPixels color={ghostColor} />

        {/* 表情 */}
        {getFace()}

        {/* Lv.3 キラキラ（ピクセル十字） */}
        {natsukiLevel >= 3 && (
          <>
            {/* 右上キラキラ */}
            <rect x={26} y={5} width={1} height={3} fill="#FFD700" opacity={sparkleOpacity1} />
            <rect x={25} y={6} width={3} height={1} fill="#FFD700" opacity={sparkleOpacity1} />
            {/* 左上キラキラ */}
            <rect x={4} y={8} width={1} height={2} fill="#FFD700" opacity={sparkleOpacity2} />
            <rect x={3} y={9} width={3} height={1} fill="#FFD700" opacity={sparkleOpacity2} />
          </>
        )}
      </g>
    </svg>
  );
}
