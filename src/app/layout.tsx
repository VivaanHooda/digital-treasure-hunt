import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { Instrument_Serif, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import ArchiveBackground from "@/components/ui/ArchiveBackground";
import { Dock } from "@/components/ui/Dock";
import { DynamicIslandProvider } from "@/components/ui/DynamicIsland";
import { TransmissionAlerts } from "@/components/ui/TransmissionAlerts";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Digital Treasure Hunt",
  description: "An intelligence operation disguised as a game.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${instrumentSerif.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        <Providers>
          <DynamicIslandProvider>
            <ArchiveBackground />
            <div className="relative z-10 min-h-dvh">{children}</div>
            <TransmissionAlerts />
            <Dock />
          </DynamicIslandProvider>
        </Providers>
      </body>
    </html>
  );
}
