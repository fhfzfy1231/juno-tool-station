import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Juno Tool Station",
  description: "面向 Juno: New Origins 的轨道规划、Δv 计算、Label 转换与 MFD 设计工具站。",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
