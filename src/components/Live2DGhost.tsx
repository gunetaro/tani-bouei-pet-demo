"use client";

import { useEffect, useRef } from "react";
import type { PetStatus } from "@/lib/pet-constants";

export interface GhostApi {
  triggerJump: () => void;
  triggerOhayou: () => void;
  triggerOyasumi: () => void;
}

interface Live2DGhostProps {
  status: PetStatus;
  mood: number;
  natsukiLevel: number;
  onModelReady?: (api: GhostApi) => void;
}

const HAPPY_PARAMS = ["ParamMouthForm", "ParamEyeLSmile", "ParamEyeRSmile"];
const LERP_SPEED = 0.08;

// Jump animation tuning – gentle "puni" squash, not kagami-mochi
const JUMP_INITIAL_VEL = -10;
const JUMP_GRAVITY = 1.0;
const JUMP_BOUNCE_RESTITUTION = 0.4;
const JUMP_BOUNCE_MIN_VEL = 2;
const JUMP_PREP_FRAMES = 5;
const JUMP_PREP_SQUASH = 0.92;
const JUMP_SQUASH_K = 0.005;
const JUMP_STRETCH_K = 0.004;
const JUMP_MAX_STRETCH = 1.12;
const JUMP_MIN_SQUASH = 0.88;
const JUMP_RECOVER_SPEED = 0.18;
const JUMP_ANGLE_Z_IMPULSE = 3;
const JUMP_ANGLE_X_IMPULSE = 1.5;
const JUMP_ANGLE_DECAY = 0.92;

// Ohayou animation (~1.5s at 60fps)
const OHAYOU_DURATION = 90;
const OHAYOU_SWAY_AMP = 12;
const OHAYOU_SWAY_PERIOD = 30;
const OHAYOU_SWAY_DECAY = 0.97;
const OHAYOU_SMILE_MAX = 0.6;
const OHAYOU_SMILE_IN = 15;
const OHAYOU_SMILE_OUT = 25;

// Oyasumi animation (~5s total)
const OYASUMI_CLOSE_FRAMES = 60;
const OYASUMI_HOLD_FRAMES = 180;
const OYASUMI_OPEN_FRAMES = 60;
const OYASUMI_TOTAL = OYASUMI_CLOSE_FRAMES + OYASUMI_HOLD_FRAMES + OYASUMI_OPEN_FRAMES;

const FIT_RATIO = 0.8;
const CANVAS_PAD = 2;

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function patchCubismCoreV6() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const core = (window as any).Live2DCubismCore;
  if (!core?.Model?.fromMoc) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((core.Model as any).__patched) return;

  const origFromMoc = core.Model.fromMoc;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  core.Model.fromMoc = function (moc: any) {
    const model = origFromMoc.call(this, moc);
    if (model?.drawables && model.renderOrders && !model.drawables.renderOrders) {
      model.drawables.renderOrders = model.renderOrders;
    }
    return model;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (core.Model as any).__patched = true;
}

function waitForCubismCore(timeout = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).Live2DCubismCore) {
      resolve();
      return;
    }
    const start = Date.now();
    const check = setInterval(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  onModelReady,
}: Live2DGhostProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let app: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let model: any = null;
    let ro: ResizeObserver | null = null;
    let careSmile = false;
    let careSmileTimer: ReturnType<typeof setTimeout> | null = null;
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
          "/live2d/obake/obake_body1.model3.json"
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
        let jumpSY = 1;
        let jumpSX = 1;
        let jumpPrepFrame = 0;
        let jumpAngleZ = 0;
        let jumpAngleX = 0;

        // --- Care animation state ---
        let activeAnim: "none" | "ohayou" | "oyasumi" = "none";
        let animFrame = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let savedEyeBlink: any = null;

        const cancelAnim = () => {
          activeAnim = "none";
          animFrame = 0;
          if (savedEyeBlink && model.internalModel) {
            model.internalModel.eyeBlink = savedEyeBlink;
            savedEyeBlink = null;
          }
        };

        const applyJumpTransform = () => {
          model.scale.set(baseScale * jumpSX, baseScale * jumpSY);
          const anchorMul = model.anchor ? 0.5 : 1;
          const groundComp =
            jumpOffsetY === 0
              ? origH * baseScale * (1 - jumpSY) * anchorMul
              : 0;
          model.y = baseY + jumpOffsetY + groundComp;
          if (!model.anchor) {
            const rw = app.renderer.width;
            model.x = (rw - origW * baseScale * jumpSX) / 2;
          }
        };

        const fitModel = () => {
          if (destroyed || !canvasRef.current) return;
          const p = canvasRef.current.parentElement!;
          const logW = p.clientWidth;
          const logH = p.clientHeight;
          const rw = Math.round(logW * CANVAS_PAD);
          const rh = Math.round(logH * CANVAS_PAD);
          app.renderer.resize(rw, rh);
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
                jumpSY = 1;
                jumpSX = 1;
              }
              break;
            }
            case "air": {
              jumpVy += JUMP_GRAVITY;
              jumpOffsetY += jumpVy;
              if (jumpVy < 0) {
                jumpSY = Math.min(1 + Math.abs(jumpVy) * JUMP_STRETCH_K, JUMP_MAX_STRETCH);
              } else {
                jumpSY = Math.max(1 - jumpVy * JUMP_SQUASH_K, JUMP_MIN_SQUASH);
              }
              jumpSX = 1 / jumpSY;
              if (jumpOffsetY >= 0 && jumpVy > 0) {
                jumpOffsetY = 0;
                jumpSY = Math.max(1 - jumpVy * JUMP_SQUASH_K, JUMP_MIN_SQUASH);
                jumpSX = 1 / jumpSY;
                const dir = Math.random() > 0.5 ? 1 : -1;
                jumpAngleZ += jumpVy * JUMP_ANGLE_Z_IMPULSE * dir;
                jumpAngleX += jumpVy * JUMP_ANGLE_X_IMPULSE * dir;
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
                Math.abs(jumpAngleZ) < 0.5 &&
                Math.abs(jumpAngleX) < 0.5
              ) {
                jumpSY = 1;
                jumpSX = 1;
                jumpOffsetY = 0;
                jumpAngleZ = 0;
                jumpAngleX = 0;
                jumpPhase = "idle";
              }
              break;
            }
          }

          jumpAngleZ *= JUMP_ANGLE_DECAY;
          jumpAngleX *= JUMP_ANGLE_DECAY;
          applyJumpTransform();
        };

        const onTap = () => {
          cancelAnim();
          startJump();
        };
        model.on("pointerdown", onTap);
        model.interactive = true;
        model.cursor = "pointer";

        // Parameter animation via "beforeModelUpdate" hook
        const currentValues: Record<string, number> = {};
        for (const id of HAPPY_PARAMS) currentValues[id] = 0;

        model.internalModel.on("beforeModelUpdate", () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const coreModel: any = model.internalModel?.coreModel;
          if (!coreModel) return;

          if (activeAnim !== "none") animFrame++;

          // --- Ohayou: additive sway on AngleZ ---
          if (activeAnim === "ohayou") {
            if (animFrame > OHAYOU_DURATION) {
              cancelAnim();
            } else {
              const decay = Math.pow(OHAYOU_SWAY_DECAY, animFrame);
              const sway =
                OHAYOU_SWAY_AMP *
                decay *
                Math.sin((animFrame * Math.PI * 2) / OHAYOU_SWAY_PERIOD);
              const idxZ = coreModel.getParameterIndex("ParamAngleZ");
              const curZ = coreModel.getParameterValueByIndex(idxZ);
              coreModel.setParameterValueById("ParamAngleZ", (curZ ?? 0) + sway);
            }
          }

          // --- Smile ---
          let smileGoal = 0;
          if (careSmile) smileGoal = 1;
          if (activeAnim === "ohayou" && animFrame <= OHAYOU_DURATION) {
            let s = OHAYOU_SMILE_MAX;
            if (animFrame < OHAYOU_SMILE_IN) {
              s = OHAYOU_SMILE_MAX * (animFrame / OHAYOU_SMILE_IN);
            } else if (animFrame > OHAYOU_DURATION - OHAYOU_SMILE_OUT) {
              s = OHAYOU_SMILE_MAX * ((OHAYOU_DURATION - animFrame) / OHAYOU_SMILE_OUT);
            }
            smileGoal = Math.max(smileGoal, s);
          }

          for (const id of HAPPY_PARAMS) {
            currentValues[id] += (smileGoal - currentValues[id]) * LERP_SPEED;
            if (Math.abs(currentValues[id] - smileGoal) < 0.01) {
              currentValues[id] = smileGoal;
            }
            coreModel.setParameterValueById(id, currentValues[id]);
          }

          // --- Oyasumi: smooth eye close/open ---
          if (activeAnim === "oyasumi") {
            let eyeVal = 1;
            if (animFrame <= OYASUMI_CLOSE_FRAMES) {
              eyeVal = 1 - easeInOut(animFrame / OYASUMI_CLOSE_FRAMES);
            } else if (animFrame <= OYASUMI_CLOSE_FRAMES + OYASUMI_HOLD_FRAMES) {
              eyeVal = 0;
            } else if (animFrame <= OYASUMI_TOTAL) {
              eyeVal = easeInOut(
                (animFrame - OYASUMI_CLOSE_FRAMES - OYASUMI_HOLD_FRAMES) /
                  OYASUMI_OPEN_FRAMES
              );
            } else {
              cancelAnim();
            }
            if (activeAnim === "oyasumi") {
              coreModel.setParameterValueById("ParamEyeLOpen", eyeVal);
              coreModel.setParameterValueById("ParamEyeROpen", eyeVal);
            }
          }

          // --- Jump angle impulse → physics chain ---
          if (Math.abs(jumpAngleZ) > 0.1) {
            const idxZ = coreModel.getParameterIndex("ParamAngleZ");
            const curZ = coreModel.getParameterValueByIndex(idxZ);
            coreModel.setParameterValueById("ParamAngleZ", (curZ ?? 0) + jumpAngleZ);
          }
          if (Math.abs(jumpAngleX) > 0.1) {
            const idxX = coreModel.getParameterIndex("ParamAngleX");
            const curX = coreModel.getParameterValueByIndex(idxX);
            coreModel.setParameterValueById("ParamAngleX", (curX ?? 0) + jumpAngleX);
          }
        });

        // Expose care animation API
        onModelReady?.({
          triggerJump: () => {
            cancelAnim();
            careSmile = true;
            if (careSmileTimer) clearTimeout(careSmileTimer);
            careSmileTimer = setTimeout(() => { careSmile = false; }, 2000);
            startJump();
          },
          triggerOhayou: () => {
            cancelAnim();
            activeAnim = "ohayou";
            animFrame = 0;
          },
          triggerOyasumi: () => {
            cancelAnim();
            activeAnim = "oyasumi";
            animFrame = 0;
            const eb = model.internalModel?.eyeBlink;
            if (eb) {
              savedEyeBlink = eb;
              model.internalModel.eyeBlink = null;
            }
          },
        });

        app.ticker.add(tickJump);
      } catch (e) {
        console.error("[Live2D] init failed:", e);
      }
    })();

    return () => {
      destroyed = true;
      ro?.disconnect();
      if (careSmileTimer) clearTimeout(careSmileTimer);
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
