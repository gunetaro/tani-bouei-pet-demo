"use client";

import { useEffect, useRef } from "react";
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
  const isHappyRef = useRef(isHappy ?? false);
  isHappyRef.current = isHappy ?? false;

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let app: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let model: any = null;
    let ro: ResizeObserver | null = null;
    let tapTimer: ReturnType<typeof setTimeout> | null = null;
    let tapHappy = false;
    let destroyed = false;

    (async () => {
      patchCubismCoreV6();

      const PIXI = await import("pixi.js");
      if (destroyed) return;

      (window as unknown as Record<string, unknown>).PIXI = PIXI;
      const { Live2DModel } = await import(
        "pixi-live2d-display-lipsyncpatch/cubism4"
      );
      if (destroyed) return;

      if (!canvasRef.current) return;
      const parent = canvasRef.current.parentElement!;

      app = new PIXI.Application({
        view: canvasRef.current,
        backgroundAlpha: 0,
        width: parent.clientWidth,
        height: parent.clientHeight,
        antialias: true,
      });

      model = await Live2DModel.from(
        "/live2d/obake/obake_body.model3.json"
      );
      if (destroyed) {
        model.destroy({ children: true });
        app.destroy(false, { children: true });
        return;
      }

      const origW = model.width;
      const origH = model.height;

      app.stage.addChild(model);

      const fitModel = () => {
        if (destroyed || !canvasRef.current) return;
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
      const onTap = () => {
        tapHappy = true;
        if (tapTimer) clearTimeout(tapTimer);
        tapTimer = setTimeout(() => { tapHappy = false; }, 2000);
      };
      model.on("pointerdown", onTap);
      model.interactive = true;
      model.cursor = "pointer";

      // Expression lerp loop
      const currentValues: Record<string, number> = {};
      for (const id of HAPPY_PARAMS) currentValues[id] = 0;

      app.ticker.add(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const coreModel: any = model.internalModel?.coreModel;
        if (!coreModel) return;

        const target = (isHappyRef.current || tapHappy) ? 1 : 0;
        for (const id of HAPPY_PARAMS) {
          currentValues[id] += (target - currentValues[id]) * LERP_SPEED;
          if (Math.abs(currentValues[id] - target) < 0.01) {
            currentValues[id] = target;
          }
          coreModel.setParameterValueById(id, currentValues[id]);
        }
      });
    })();

    return () => {
      destroyed = true;
      ro?.disconnect();
      if (tapTimer) clearTimeout(tapTimer);
      if (app) {
        app.ticker.stop();
        if (model) {
          model.off("pointerdown");
          model.destroy({ children: true });
        }
        // false = don't remove canvas from DOM (React manages it)
        app.destroy(false, { children: true, texture: true, baseTexture: true });
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block" }}
    />
  );
}
