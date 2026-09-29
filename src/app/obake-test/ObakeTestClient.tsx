'use client';

// 動作確認用のページ（/obake-test）。本番公開前に消してOK
import { useRef, useState } from 'react';
import ObakePet, { type ObakePetHandle } from '@/components/ObakePet';
import { OBAKE_PRESET_LARGE } from '@/lib/pet-constants';

const MOTIONS = ['nod', 'shake', 'look', 'sleepy', 'sad', 'nade', 'poke', 'tickle', 'waveL', 'waveR', 'banzai'] as const;

export default function ObakeTestClient() {
  const pet = useRef<ObakePetHandle>(null);
  const [state, setState] = useState('idle');
  const [mood, setMood] = useState('ふつう');
  // 放置判定テスト用
  const [sulkShown, setSulkShown] = useState(false);
  const [iedeShown, setIedeShown] = useState(false);
  const btn = 'rounded-full border px-3 py-1 text-sm';
  const btnWarn = 'rounded-full border border-orange-300 bg-orange-50 text-orange-700 px-3 py-1 text-sm';

  // 放置1日シミュレーション: アプリの advanceDay と同じ判定パターン
  const simulateSulk = () => {
    if (!sulkShown) {
      pet.current?.sulk();
      setSulkShown(true);
    } else {
      pet.current?.setState('sulk');
    }
  };

  // 放置3日シミュレーション: setState('sulk') → iede()
  const simulateIede = () => {
    if (!iedeShown) {
      pet.current?.setState('sulk');
      pet.current?.iede();
      setIedeShown(true);
    } else {
      pet.current?.setState('gone');
    }
  };

  // 記録リセット: おはよう仲直り / find 後と同じ
  const resetShownFlags = () => {
    setSulkShown(false);
    setIedeShown(false);
    pet.current?.setState('idle');
  };

  return (
    <main className="mx-auto max-w-xl space-y-4 p-4">
      <div className="aspect-[642/472] w-full overflow-hidden rounded-2xl border-4 border-gray-500 bg-[#C5CCA1]">
        <ObakePet ref={pet} preset={OBAKE_PRESET_LARGE} onStateChange={setState} onMood={setMood} />
      </div>
      <p className="text-sm">状態: {state} ／ きぶん: {mood}</p>
      <div className="flex flex-wrap gap-2">
        <button className={btn} onClick={() => pet.current?.ohayo()}>おはよう</button>
        <button className={btn} onClick={() => pet.current?.touko()}>とうこう</button>
        <button className={btn} onClick={() => pet.current?.oyasumi()}>おやすみ</button>
        <button className={btn} onClick={() => pet.current?.sulk()}>1日ほうち（すねる）</button>
        <button className={btn} onClick={() => pet.current?.iede()}>3日ほうち（いえで）</button>
        <button className={btn} onClick={() => pet.current?.find()}>だいがくへ（みつける）</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {MOTIONS.map(m => <button key={m} className={btn} onClick={() => pet.current?.play(m)}>{m}</button>)}
      </div>
      <div className="flex flex-wrap gap-2">
        {(['idle', 'sleep', 'sulk', 'gone'] as const).map(s => <button key={s} className={btn} onClick={() => pet.current?.setState(s)}>setState: {s}</button>)}
      </div>
      {/* 放置判定テスト */}
      <div className="border-t pt-3 space-y-2">
        <p className="text-xs text-gray-500">放置判定テスト（sulkShown={String(sulkShown)}, iedeShown={String(iedeShown)}）</p>
        <div className="flex flex-wrap gap-2">
          <button className={btnWarn} onClick={simulateSulk}>
            放置判定を1日にする
          </button>
          <button className={btnWarn} onClick={simulateIede}>
            放置判定を3日にする
          </button>
          <button className={btn} onClick={resetShownFlags}>
            記録をリセット
          </button>
        </div>
      </div>
    </main>
  );
}
