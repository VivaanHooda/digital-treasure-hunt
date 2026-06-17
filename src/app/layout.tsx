import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import AnimatedBackground from "@/components/AnimatedBackground";

export const metadata: Metadata = {
  title: "Digital Treasure Hunt",
  description: "RVCE digital treasure hunt — find locations, solve riddles, climb the leaderboard.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d1117",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="relative min-h-screen overflow-hidden">
            <AnimatedBackground />
            <div className="relative z-10 min-h-screen">{children}</div>

            {/* Ambient light effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
              <div className="absolute top-0 left-1/4 w-48 h-48 sm:w-72 sm:h-72 lg:w-96 lg:h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" />
              <div
                className="absolute bottom-0 right-1/4 w-48 h-48 sm:w-72 sm:h-72 lg:w-96 lg:h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse"
                style={{ animationDelay: "1s" }}
              />
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-72 sm:h-72 lg:w-96 lg:h-96 bg-blue-500/3 rounded-full blur-3xl animate-pulse"
                style={{ animationDelay: "2s" }}
              />
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
