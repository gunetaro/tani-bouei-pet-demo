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
      setFrame((f) => (f + 1) % 4);
      setBobY((y) => (y === 0 ? -2 : 0));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  if (status === "runaway") {
    return (
      <svg viewBox="0 0 30 24" className="w-44 h-36" style={{ imageRendering: "pixelated" }}>
        <text x="15" y="10" textAnchor="middle" fontSize="4" fill="#999" fontFamily="monospace">
          ……いない
        </text>
        <rect x="13" y="14" width="1" height="1" fill="#D3D1C7" opacity="0.3" />
        <rect x="16" y="16" width="1" height="1" fill="#D3D1C7" opacity="0.2" />
      </svg>
    );
  }

  const ghostColor = status === "distant" ? "#B4B2A9" : status === "sad" ? "#D3D1C7" : "#F1EFE8";
  const ghostX = status === "distant" ? 20 : 0;
  const scale = natsukiLevel >= 3 ? 1.05 : natsukiLevel >= 2 ? 1.0 : 0.95;

  const getEyes = () => {
    if (isHappy) {
      return (
        <>
          <rect x="11" y="9" width="2" height="1" fill="#2C2C2A" />
          <rect x="17" y="9" width="2" height="1" fill="#2C2C2A" />
          <rect x="13" y="12" width="4" height="1" fill="#2C2C2A" />
          <rect x="12" y="11" width="1" height="1" fill="#2C2C2A" />
          <rect x="17" y="11" width="1" height="1" fill="#2C2C2A" />
        </>
      );
    }
    if (status === "distant") {
      return (
        <>
          <rect x="11" y="9" width="2" height="2" fill="#2C2C2A" />
          <rect x="17" y="9" width="2" height="2" fill="#2C2C2A" />
          <rect x="13" y="13" width="4" height="1" fill="#2C2C2A" />
        </>
      );
    }
    if (status === "sad" || mood < 30) {
      return (
        <>
          <rect x="11" y="10" width="2" height="2" fill="#2C2C2A" />
          <rect x="17" y="10" width="2" height="2" fill="#2C2C2A" />
          <rect x="13" y="14" width="4" height="1" fill="#2C2C2A" />
        </>
      );
    }
    if (mood > 70) {
      return (
        <>
          <rect x="11" y="9" width="2" height="2" fill="#2C2C2A" />
          <rect x="17" y="9" width="2" height="2" fill="#2C2C2A" />
          <rect x="13" y="13" width="1" height="1" fill="#FFB8C6" />
          <rect x="16" y="13" width="1" height="1" fill="#FFB8C6" />
          <rect x="14" y="12" width="2" height="1" fill="#2C2C2A" />
        </>
      );
    }
    return (
      <>
        <rect x="11" y="9" width="2" height="2" fill="#2C2C2A" />
        <rect x="17" y="9" width="2" height="2" fill="#2C2C2A" />
      </>
    );
  };

  return (
    <svg viewBox="0 0 30 24" className="w-44 h-36" style={{ imageRendering: "pixelated" }}>
      <g
        transform={`translate(${ghostX}, ${bobY}) scale(${scale})`}
        style={{ transformOrigin: "15px 12px" }}
      >
        <rect x="10" y="4" width="10" height="2" fill={ghostColor} />
        <rect x="8" y="6" width="14" height="2" fill={ghostColor} />
        <rect x="7" y="8" width="16" height="8" fill={ghostColor} />
        <rect x="7" y="16" width="4" height="2" fill={ghostColor} />
        <rect x="13" y="16" width="4" height="2" fill={ghostColor} />
        <rect x="19" y="16" width="4" height="2" fill={ghostColor} />
        <rect x="7" y="18" width="2" height="2" fill={ghostColor} />
        <rect x="15" y="18" width="2" height="2" fill={ghostColor} />
        <rect x="21" y="18" width="2" height="2" fill={ghostColor} />
        {getEyes()}
        {natsukiLevel >= 3 && (
          <rect x="22" y="5" width="2" height="2" fill="#FFD700" opacity={frame % 2 === 0 ? 0.8 : 0.4} />
        )}
      </g>
    </svg>
  );
}
