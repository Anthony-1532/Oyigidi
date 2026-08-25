import type { Metadata } from "next";
import { Fraunces, Manrope, DM_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const dmMono = DM_Mono({ variable: "--font-dm-mono", weight: ["400", "500"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Oyigidi AI · Coaching intelligence", template: "%s · Oyigidi AI" },
  description: "A private, role-aware coaching workspace: client journeys, coach-controlled curriculum and knowledge, and accountable administration.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable} ${dmMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
