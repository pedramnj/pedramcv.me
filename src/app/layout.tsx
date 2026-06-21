import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MobileGate from "@/components/shell/MobileGate";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const SITE = "https://pedramcv.me";
const TITLE = "Pedram Nikjooy — The Live Pipeline Playground";
const DESCRIPTION =
  "An interactive, animated cloud-native pipeline you can actually run. Edit real code, hit run, and watch it flow through CI, Docker, Terraform, Kubernetes and Grafana as glowing liquid. Built by Pedram Nikjooy, Cloud & DevOps Engineer.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Pipeline Playground",
  authors: [{ name: "Pedram Nikjooy", url: "https://github.com/pedramnj" }],
  keywords: [
    "Pedram Nikjooy",
    "Cloud Engineer",
    "DevOps",
    "CI/CD",
    "Kubernetes",
    "Terraform",
    "Docker",
    "Prometheus",
    "Grafana",
    "AWS Cloud Practitioner",
    "CLF-C02",
    "interactive portfolio",
  ],
  openGraph: {
    type: "website",
    url: SITE,
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Pipeline Playground",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  // icons auto-detected from app/icon.svg, app/favicon.ico, app/apple-icon.png
};

export const viewport: Viewport = {
  themeColor: "#04060d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        {/* Python runs via Pyodide lazy-loaded from jsdelivr — warm the DNS early. */}
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        {children}
        <MobileGate />
      </body>
    </html>
  );
}
