import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "たんいぼうえいペット - デモ版",
  description: "ログイン不要・ブラウザだけで遊べる体験版",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DotGothic16&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-mono antialiased">
        <Script
          src="/live2d/live2dcubismcore.min.js"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
