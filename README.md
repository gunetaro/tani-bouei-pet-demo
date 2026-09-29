# たんいぼうえいペット デモ版

大学生の登校習慣をサポートするペットアプリのデモ版です。
Live2D のおばけが、おはよう・とうこう・おやすみに反応します。

**公開URL:** https://tani-bouei-pet-demo.vercel.app/

---

## ローカルで動かす（Mac）

### 必要なもの

- **Node.js 22 以上**（まだ入っていなければ↓）
- **Git**（Xcode Command Line Tools に入っています）

Node.js が入っていない場合：

```bash
# Homebrew で入れる場合
brew install node

# または nvm で入れる場合
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 22
```

### セットアップ

```bash
# 1. リポジトリをクローン
git clone https://github.com/gunetaro/tani-bouei-pet-demo.git
cd tani-bouei-pet-demo

# 2. パッケージをインストール
npm install

# 3. 開発サーバーを起動
npm run dev
```

起動したら、ターミナルに表示される URL（通常 http://localhost:3000 ）をブラウザで開いてください。

### PC表示とスマホ表示を切り替える

ブラウザの開発者ツールを使います。

1. ページを開いた状態で **Cmd + Option + I** を押す（開発者ツールが開く）
2. 左上の **デバイスアイコン**（スマホとタブレットの絵）をクリック
3. 上のドロップダウンで端末を選ぶ
   - **iPhone SE** や **iPhone 14 Pro**：スマホ表示（1カラム）
   - **iPad Air**：タブレット表示
   - **Responsive → 幅を広げる**：PC表示（3カラム、1024px以上）

<img width="400" alt="Chrome DevTools のデバイスモード" src="https://developer.chrome.com/static/docs/devtools/device-mode/image/device-toolbar-c57a8ac2302cd.png">

### サーバーを止める

ターミナルで **Ctrl + C** を押すと止まります。

---

## ファイル構成（主なもの）

```
src/
  app/
    page.tsx          ← ホーム画面（おばけ・お世話ボタン・デモパネル）
    layout.tsx         ← 全ページ共通のレイアウト
    obake-test/        ← 開発用テストページ（本番では非表示）
  components/
    ObakePet.tsx       ← おばけ Live2D コンポーネント
  lib/
    obake/
      obake-engine.js  ← おばけ描画エンジン（Cubism Core + SVG）
      obake-engine.d.ts
    pet-constants.ts   ← なつき度・ケアポイントなどの定数
public/
  obake/               ← おばけの素材（moc3・rig・motions・Cubism Core）
```

## 技術スタック

- Next.js 16（App Router）
- React 19
- TypeScript
- Tailwind CSS v4
- Live2D Cubism Core（WASM）+ SVG 描画
- Vercel（デプロイ）
