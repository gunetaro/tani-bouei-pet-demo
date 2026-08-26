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

// Jump animation tuning – gentle "puni" squash, not kagami-mochi
const JUMP_INITIAL_VEL = -25;         // upward launch speed (negative = up)
const JUMP_GRAVITY = 0.8;             // downward acceleration per frame
const JUMP_BOUNCE_RESTITUTION = 0.45; // fraction of velocity kept per bounce
const JUMP_BOUNCE_MIN_VEL = 4;        // stop bouncing below this (gives ~3 bounces)
const JUMP_PREP_FRAMES = 5;           // pre-jump squat frames
const JUMP_PREP_SQUASH = 0.92;        // scaleY during squat (subtle dip)
const JUMP_SQUASH_K = 0.005;          // |velocity| → squash depth (sy = 1 - k*|vy|)
const JUMP_STRETCH_K = 0.004;         // |velocity| → stretch (sy = 1 + k*|vy|)
const JUMP_MAX_STRETCH = 1.12;        // max scaleY stretch
const JUMP_MIN_SQUASH = 0.88;         // min scaleY squash (hard floor)
const JUMP_RECOVER_SPEED = 0.18;      // lerp rate from squash back to 1
const JUMP_ANGLE_IMPULSE = 20;        // ParamAngleZ degrees on each landing
const JUMP_ANGLE_DECAY = 0.88;        // per-frame angle decay

const FIT_RATIO = 0.8;          // model fills 80% of visible area → 20% animation margin
const CANVAS_PAD = 2;           // renderer is 2× parent → room for model overflow + squash

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

function waitForCubismCore(timeout = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Live2DCubismCore) {
      resolve();
      return;
    }
    const start = Date.now();
    const check = setInterval(() => {
      if ((window as any).Live2DCubismCore) {
        clearInterval(check);
        resolve();
      } else if (Date.now() - start > timeout) {
        clearInterval(check);
        reject(new Error("Cubism Core load timeout"));
      }
    }, 50);
  });
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
      try {
        await waitForCubismCore();
        if (destroyed) return;
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
          width: Math.round(parent.clientWidth * CANVAS_PAD),
          height: Math.round(parent.clientHeight * CANVAS_PAD),
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

        // --- Jump animation state ---
        let baseY = 0;
        let baseScale = 1;
        let jumpPhase: "idle" | "prep" | "air" | "recover" = "idle";
        let jumpVy = 0;
        let jumpOffsetY = 0;
        let jumpSY = 1; // scaleY multiplier (1 = normal)
        let jumpSX = 1; // scaleX multiplier (volume-preserving: 1/jumpSY)
        let jumpPrepFrame = 0;
        let jumpAngleZ = 0;

        const applyJumpTransform = () => {
          model.scale.set(baseScale * jumpSX, baseScale * jumpSY);
          // Keep bottom edge fixed when squashing on the "ground"
          const anchorMul = model.anchor ? 0.5 : 1;
          const groundComp =
            jumpOffsetY === 0
              ? origH * baseScale * (1 - jumpSY) * anchorMul
              : 0;
          model.y = baseY + jumpOffsetY + groundComp;
          if (!model.anchor) {
            // Centre within the (larger) renderer
            const rw = app.renderer.width;
            model.x = (rw - origW * baseScale * jumpSX) / 2;
          }
        };

        const fitModel = () => {
          if (destroyed || !canvasRef.current) return;
          const p = canvasRef.current.parentElement!;
          // Logical = visible green-frame area
          const logW = p.clientWidth;
          const logH = p.clientHeight;
          // Renderer is padded so squash/stretch doesn't hit the edge
          const rw = Math.round(logW * CANVAS_PAD);
          const rh = Math.round(logH * CANVAS_PAD);
          app.renderer.resize(rw, rh);
          // Scale is based on LOGICAL size → model's visual size stays constant
          baseScale = Math.min(logW / origW, logH / origH) * FIT_RATIO;
          if (model.anchor) {
            model.anchor.set(0.5, 0.5);
            model.x = rw / 2;
            baseY = rh / 2;
          } else {
            model.x = (rw - origW * baseScale) / 2;
            baseY = (rh - origH * baseScale) / 2;
          }
          applyJumpTransform();
        };

        fitModel();
        ro = new ResizeObserver(fitModel);
        ro.observe(parent);

        const startJump = () => {
          if (jumpPhase !== "idle") return;
          jumpPhase = "prep";
          jumpPrepFrame = 0;
          jumpVy = 0;
          jumpOffsetY = 0;
          jumpSY = 1;
          jumpSX = 1;
        };

        const tickJump = () => {
          if (destroyed || jumpPhase === "idle") return;

          switch (jumpPhase) {
            case "prep": {
              jumpPrepFrame++;
              const t = jumpPrepFrame / JUMP_PREP_FRAMES;
              jumpSY =
                1 - (1 - JUMP_PREP_SQUASH) * Math.sin(t * Math.PI * 0.5);
              jumpSX = 1 / jumpSY;
              if (jumpPrepFrame >= JUMP_PREP_FRAMES) {
                jumpPhase = "air";
                jumpVy = JUMP_INITIAL_VEL;
                // Start air with sy=1 (no snap from prep squash to extreme stretch)
                jumpSY = 1;
                jumpSX = 1;
              }
              break;
            }
            case "air": {
              jumpVy += JUMP_GRAVITY;
              jumpOffsetY += jumpVy;
              // Stretch/squash proportional to speed, clamped to gentle range
              if (jumpVy < 0) {
                // Rising → slight vertical stretch
                jumpSY = Math.min(1 + Math.abs(jumpVy) * JUMP_STRETCH_K, JUMP_MAX_STRETCH);
              } else {
                // Falling → slight vertical squash
                jumpSY = Math.max(1 - jumpVy * JUMP_SQUASH_K, JUMP_MIN_SQUASH);
              }
              jumpSX = 1 / jumpSY;
              // Ground hit
              if (jumpOffsetY >= 0 && jumpVy > 0) {
                jumpOffsetY = 0;
                // Landing squash – velocity-proportional, clamped
                jumpSY = Math.max(1 - jumpVy * JUMP_SQUASH_K, JUMP_MIN_SQUASH);
                jumpSX = 1 / jumpSY;
                jumpAngleZ +=
                  JUMP_ANGLE_IMPULSE * (Math.random() > 0.5 ? 1 : -1);
                if (jumpVy < JUMP_BOUNCE_MIN_VEL) {
                  jumpPhase = "recover";
                } else {
                  jumpVy = -jumpVy * JUMP_BOUNCE_RESTITUTION;
                }
              }
              break;
            }
            case "recover": {
              jumpSY += (1 - jumpSY) * JUMP_RECOVER_SPEED;
              jumpSX = 1 / jumpSY;
              if (
                Math.abs(jumpSY - 1) < 0.005 &&
                Math.abs(jumpAngleZ) < 0.5
              ) {
                jumpSY = 1;
                jumpSX = 1;
                jumpOffsetY = 0;
                jumpAngleZ = 0;
                jumpPhase = "idle";
              }
              break;
            }
          }

          jumpAngleZ *= JUMP_ANGLE_DECAY;
          applyJumpTransform();
        };

        const onTap = () => {
          tapHappy = true;
          if (tapTimer) clearTimeout(tapTimer);
          tapTimer = setTimeout(() => { tapHappy = false; }, 2000);
          startJump();
        };
        model.on("pointerdown", onTap);
        model.interactive = true;
        model.cursor = "pointer";

        // Smile expression via "beforeModelUpdate" hook
        // This fires AFTER blink/focus/breath/physics/pose but BEFORE model.update()
        // so our values are included in this frame's drawable computation.
        const currentValues: Record<string, number> = {};
        for (const id of HAPPY_PARAMS) currentValues[id] = 0;

        model.internalModel.on("beforeModelUpdate", () => {
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

          // Landing angle impulse → feeds into physics → hair/hem sway
          if (Math.abs(jumpAngleZ) > 0.1) {
            const idx = coreModel.getParameterIndex("ParamAngleZ");
            const cur = coreModel.getParameterValueByIndex(idx);
            coreModel.setParameterValueById(
              "ParamAngleZ",
              (cur ?? 0) + jumpAngleZ,
            );
          }

        });

        // Drive jump animation each frame
        app.ticker.add(tickJump);
      } catch (e) {
        console.error("[Live2D] init failed:", e);
      }
    })();

    return () => {
      destroyed = true;
      ro?.disconnect();
      if (tapTimer) clearTimeout(tapTimer);
      try {
        if (app) {
          app.ticker.stop();
          if (model) {
            model.internalModel?.off("beforeModelUpdate");
            model.off("pointerdown");
            model.destroy({ children: true });
          }
          app.destroy(false, { children: true, texture: true, baseTexture: true });
        }
      } catch (e) {
        console.error("[Live2D] cleanup failed:", e);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute"
      style={{
        display: "block",
        width: `${CANVAS_PAD * 100}%`,
        height: `${CANVAS_PAD * 100}%`,
        left: `${(1 - CANVAS_PAD) * 50}%`,
        top: `${(1 - CANVAS_PAD) * 50}%`,
      }}
    />
  );
}
