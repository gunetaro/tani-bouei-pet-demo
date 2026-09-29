'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { ObakeApi, ObakeMotion, ObakeOptions, ObakeState } from '@/lib/obake/obake-engine';

export type ObakePetHandle = {
  ohayo: () => boolean;
  touko: () => boolean;
  oyasumi: () => boolean;
  sulk: () => boolean;
  iede: () => boolean;
  find: () => boolean;
  play: (name: ObakeMotion) => boolean;
  setState: (s: ObakeState) => void;
  say: (text: string, durSec?: number) => void;
  hearts: (n: number) => void;
  getState: () => ObakeState | null;
  /** デモ操作パネル用 */
  playDemo: (name: ObakeMotion) => boolean;
  hold: (values: Record<string, number>) => void;
  release: (ids?: string[]) => void;
  getValues: () => Record<string, number> | null;
  getHeld: () => Record<string, number>;
  /** エンジンの準備ができているか */
  ready: () => boolean;
};

type Props = {
  className?: string;
  preset?: ObakeOptions['preset'];
  /** 最初の状態。変わったときもアニメーションなしで合わせる */
  initialState?: ObakeState;
  /** 吹き出しをエンジン側で出すか（アプリ側で出すなら false にして onSay を使う） */
  bubble?: boolean;
  interactive?: boolean;
  assetBase?: string;
  onSay?: (text: string, durSec: number) => void;
  onSayEnd?: () => void;
  onMood?: (mood: string) => void;
  onStateChange?: (s: ObakeState) => void;
  onMotionEnd?: (name: ObakeMotion) => void;
  onReady?: () => void;
  onError?: (e: unknown) => void;
};

/** たんいぼうえいペットのおばけ（Live2D）。ブラウザでのみ動く */
const ObakePet = forwardRef<ObakePetHandle, Props>(function ObakePet(props, ref) {
  const box = useRef<HTMLDivElement>(null);
  const api = useRef<ObakeApi | null>(null);
  const cb = useRef(props);
  cb.current = props;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let inst: ObakeApi | null = null;
    (async () => {
      try {
        const { createObake } = await import('@/lib/obake/obake-engine');
        if (!alive || !box.current) return;
        inst = await createObake(box.current, {
          preset: props.preset ?? 'appStage',
          initialState: props.initialState ?? 'idle',
          bubble: props.bubble ?? true,
          interactive: props.interactive ?? true,
          assetBase: props.assetBase ?? '/obake',
        });
        if (!alive) { inst.destroy(); return; }
        inst.on('say', (t, d) => cb.current.onSay?.(t, d));
        inst.on('sayend', () => cb.current.onSayEnd?.());
        inst.on('mood', m => cb.current.onMood?.(m));
        inst.on('state', s => cb.current.onStateChange?.(s));
        inst.on('motionend', n => cb.current.onMotionEnd?.(n));
        api.current = inst;
        cb.current.onReady?.();
      } catch (e) {
        console.error('[ObakePet]', e);
        setFailed(true);
        cb.current.onError?.(e);
      }
    })();
    return () => { alive = false; api.current = null; inst?.destroy(); };
    // 表示範囲や素材が変わったときだけ作り直す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.preset, props.assetBase, props.bubble, props.interactive]);

  // 状態が外から変わったら、アニメーションなしで合わせる
  useEffect(() => {
    if (props.initialState && api.current && api.current.getState() !== props.initialState) api.current.setState(props.initialState);
  }, [props.initialState]);

  useImperativeHandle(ref, () => ({
    ohayo: () => api.current?.ohayo() ?? false,
    touko: () => api.current?.touko() ?? false,
    oyasumi: () => api.current?.oyasumi() ?? false,
    sulk: () => api.current?.sulk() ?? false,
    iede: () => api.current?.iede() ?? false,
    find: () => api.current?.find() ?? false,
    play: n => api.current?.play(n) ?? false,
    setState: s => api.current?.setState(s),
    say: (t, d) => api.current?.say(t, d),
    hearts: n => api.current?.hearts(n),
    getState: () => api.current?.getState() ?? null,
    playDemo: n => api.current?.playDemo(n) ?? false,
    hold: v => api.current?.hold(v),
    release: ids => api.current?.release(ids),
    getValues: () => api.current?.getValues() ?? null,
    getHeld: () => api.current?.getHeld() ?? {},
    ready: () => !!api.current,
  }), []);

  return (
    <div ref={box} className={props.className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {failed && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 12, opacity: 0.6 }}>おばけを読み込めませんでした</div>}
    </div>
  );
});

export default ObakePet;
