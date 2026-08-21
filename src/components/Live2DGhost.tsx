"use client";

import { useEffect, useRef, useCallback } from "react";
import type { PetStatus } from "@/lib/pet-constants";

interface Live2DGhostProps {
  status: PetStatus;
  mood: number;
  natsukiLevel: number;
  isHappy?: boolean;
}

const HAPPY_PARAMS = ["ParamMouthForm", "ParamEyeLSmile", "ParamEyeRSmile"];
const LERP_SPEED = 0.08;

function patchCubismCoreV6() {
  const core = (window as any).Live2DCubismCore;
  if (!core?.Model?.fromMoc) return;
  if ((core.Model as any).__patched) return;

  const origFromMoc = core.Model.fromMoc;
  core.Model.fromMoc = function (moc: any) {
    const model = origFromMoc.call(this, moc);
    if (model?.drawables && model.renderOrders && !model.drawables.renderOrders) {
      model.drawables.renderOrders = model.renderOrders;
    }
    return model;
  };
  (core.Model as any).__patched = true;
}

export default function Live2DGhost({
  status: _status,
  mood: _mood,
  natsukiLevel: _natsukiLevel,
  isHappy,
}: Live2DGhostProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initRef = useRef(false);
  const isHappyRef = useRef(isHappy ?? false);
  const tapHappyRef = useRef(false);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelRef = useRef<any>(null);

  // Keep ref in sync with props
  isHappyRef.current = isHappy ?? false;

  const handleTap = useCallback(() => {
    tapHappyRef.current = true;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      tapHappyRef.current = false;
    }, 2000);
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let app: any = null;
    let ro: ResizeObserver | null = null;

    (async () => {
      patchCubismCoreV6();

      const PIXI = await import("pixi.js");
      (window as unknown as Record<string, unknown>).PIXI = PIXI;
      const { Live2DModel } = await import(
        "pixi-live2d-display-lipsyncpatch/cubism4"
      );

      if (!canvasRef.current) return;

      const parent = canvasRef.current.parentElement!;

      app = new PIXI.Application({
        view: canvasRef.current,
        backgroundAlpha: 0,
        width: parent.clientWidth,
        height: parent.clientHeight,
        antialias: true,
      });

      const model = await Live2DModel.from(
        "/live2d/obake/obake_body.model3.json"
      );
      modelRef.current = model;

      const origW = model.width;
      const origH = model.height;

      app.stage.addChild(model);

      const fitModel = () => {
        if (!canvasRef.current || !model) return;
        const p = canvasRef.current.parentElement!;
        const w = p.clientWidth;
        const h = p.clientHeight;
        app.renderer.resize(w, h);
        const scale = Math.min(w / origW, h / origH);
        model.scale.set(scale);
        if (model.anchor) {
          model.anchor.set(0.5, 0.5);
          model.x = w / 2;
          model.y = h / 2;
        } else {
          model.x = (w - origW * scale) / 2;
          model.y = (h - origH * scale) / 2;
        }
      };

      fitModel();
      ro = new ResizeObserver(fitModel);
      ro.observe(parent);

      // Tap to trigger happy
      model.on("pointerdown", () => handleTap());
      model.interactive = true;
      model.cursor = "pointer";

      // Expression update loop — lerp happy params each frame
      const currentValues: Record<string, number> = {};
      for (const id of HAPPY_PARAMS) currentValues[id] = 0;

      app.ticker.add(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const coreModel: any = model.internalModel?.coreModel;
        if (!coreModel) return;

        const target = (isHappyRef.current || tapHappyRef.current) ? 1 : 0;
        for (const id of HAPPY_PARAMS) {
          currentValues[id] += (target - currentValues[id]) * LERP_SPEED;
          // Snap to target when close enough
          if (Math.abs(currentValues[id] - target) < 0.01) {
            currentValues[id] = target;
          }
          coreModel.setParameterValueById(id, currentValues[id]);
        }
      });
    })();

    return () => {
      ro?.disconnect();
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      app?.destroy(true);
    };
  }, [handleTap]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block" }}
    />
  );
}
