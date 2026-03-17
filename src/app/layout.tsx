import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Base Experiment Site",
  description: "Cookie-scoped experiment playground with per-user state management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
