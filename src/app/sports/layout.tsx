import type { Metadata } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono, Sora } from "next/font/google";
import { CodeInspectorEntry } from "@/components/CodeInspectorEntry";
import { SPORTS_OG_IMAGE } from "@/modules/sports/presentation/seo";
import { SportsToaster } from "@/modules/sports/presentation/ui/sonner";
import "./sports.css";

// Second root layout (dev reference §7.3): the sports pages load their own theme and fonts.
// Weights match the reference's Google Fonts request, so `font-black` falls back the same way.
const sora = Sora({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sora" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-jetbrains-mono" });
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

const description =
  "OmenX Sports is a sports platform showcasing live and upcoming events with interactive features.";

// Same head tags as the reference's root route (__root.tsx:74-89).
export const metadata: Metadata = {
  title: "OmenX | Sports",
  description,
  authors: [{ name: "Lovable" }],
  openGraph: { title: "OmenX | Sports", description, type: "website", images: SPORTS_OG_IMAGE },
  twitter: { card: "summary", site: "@Lovable", title: "OmenX | Sports", description, images: SPORTS_OG_IMAGE },
};

export default function SportsLayout({ children }: LayoutProps<"/sports">) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable}`}>
      <body>
        {children}
        <SportsToaster />
        <CodeInspectorEntry />
      </body>
    </html>
  );
}
