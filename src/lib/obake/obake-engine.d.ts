export type ObakeState = 'idle' | 'sleep' | 'sulk' | 'gone';
export type ObakeMotion =
  | 'greet' | 'touko' | 'nod' | 'shake' | 'look' | 'sleepy' | 'sad' | 'nade' | 'poke' | 'tickle'
  | 'waveL' | 'waveR' | 'banzai' | 'comeback' | 'iede' | 'mitsuketa';
export type ObakeRegion = 'head' | 'body' | 'hem' | 'armL' | 'armR';

export interface ObakePreset {
  viewBox: string;
  corner: { x: number; y: number; sc: number };
  exitX: number;
}
export const PRESETS: { square: ObakePreset; appStage: ObakePreset };

export interface ObakeOptions {
  /** 素材のURLの置き場所（既定: '/obake'） */
  assetBase?: string;
  coreSrc?: string;
  /** 'square'（ビューアと同じ正方形）| 'appStage'（デモアプリのペット枠）| 独自の範囲 */
  preset?: 'square' | 'appStage' | ObakePreset;
  corner?: Partial<ObakePreset['corner']>;
  exitX?: number;
  preserveAspectRatio?: string;
  /** 最初の状態（アニメーションなしで合わせる） */
  initialState?: ObakeState;
  /** 吹き出しをエンジン側で表示するか（false にすると 'say' イベントだけ来る） */
  bubble?: boolean;
  bubbleFontSize?: string;
  /** タップ・なでる等の反応（既定: true） */
  interactive?: boolean;
  /** デモ用の自動放置タイマー（本番では指定しない） */
  neglect?: { idleToSulkSec: number; sulkToIedeSec: number } | null;
  /** 自前でフレームを進める（テスト用） */
  manual?: boolean;
  bodyColor?: string;
  shadowColor?: string;
  ariaLabel?: string;
  /** モーションのセリフ差し替え（例: { greet: ['おはよー！'] }） */
  lines?: Partial<Record<ObakeMotion, string[]>>;
  moc?: ArrayBuffer;
  rig?: unknown;
  motions?: unknown;
}

export interface ObakeEvents {
  say: (text: string, durSec: number) => void;
  sayend: () => void;
  mood: (mood: string) => void;
  state: (state: ObakeState) => void;
  motionstart: (name: ObakeMotion) => void;
  motionend: (name: ObakeMotion) => void;
  tap: (region: ObakeRegion) => void;
  pet: () => void;
}

export interface ObakeApi {
  /** 「おはよう」：すね中なら仲直り（comeback）、それ以外は greet。いえで中は false */
  ohayo(): boolean;
  /** 「とうこう」成功：ばんざい。いえで中は false（代わりに find() を使う） */
  touko(): boolean;
  /** 「おやすみ」：寝る状態へ */
  oyasumi(): boolean;
  /** 放置1日：すみっこですねる（アニメーションあり） */
  sulk(): boolean;
  /** 放置3日：いえで（アニメーションあり、終わると 'gone'） */
  iede(): boolean;
  /** いえで中に大学へ着いた：すみっこで見つかる → 戻ってくる */
  find(): boolean;
  play(name: ObakeMotion): boolean;
  /** アニメーションなしで状態を合わせる（ページを開いた時など） */
  setState(state: ObakeState): void;
  hearts(n: number): void;
  say(text: string, durSec?: number): void;
  setMood(mood: string): void;
  getState(): ObakeState;
  getMood(): string;
  isPlaying(): ObakeMotion | null;
  motions(): ObakeMotion[];
  on<K extends keyof ObakeEvents>(ev: K, fn: ObakeEvents[K]): () => void;
  pause(): void;
  resume(): void;
  step(dt: number): void;
  /** パラメータをその値で固定する（スライダー用） */
  hold(values: Record<string, number>): void;
  /** 固定を外す（ids 省略で全部） */
  release(ids?: string[]): void;
  getValues(): Record<string, number>;
  getHeld(): Record<string, number>;
  /** デモ用：単独モーションを再生（寝ている・すね中なら起こしてから。いえで中は false） */
  playDemo(name: ObakeMotion): boolean;
  tap(region: ObakeRegion): void;
  destroy(): void;
}

export interface ObakeParamInfo { id: string; label: string; note?: string; min: number; max: number; def: number; group: 'model' | 'added'; }
export const PARAM_INFO: ObakeParamInfo[];
export const MOTION_INFO: { name: ObakeMotion; label: string }[];

export function loadCubismCore(src?: string): Promise<void>;
export function createObake(root: HTMLElement, opts?: ObakeOptions): Promise<ObakeApi>;
