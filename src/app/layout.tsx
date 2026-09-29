import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "たんいぼうえいペット - デモ版",
  description: "ログイン不要・ブラウザだけで遊べる体験版",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Chrome などが hydration 前に html へ属性を追加する場合がある。
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DotGothic16&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-mono antialiased">
        {children}
      </body>
    </html>
  );
}
