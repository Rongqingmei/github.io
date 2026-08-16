import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LINYI — 写作 / 代码 / 长期主义",
  description: "LINYI 的个人文章站，记录技术、创作与缓慢思考。",
  openGraph: { title: "LINYI — 写作 / 代码 / 长期主义", description: "技术、创作与缓慢思考。", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "LINYI", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
