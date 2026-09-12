import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/layout/app-shell";
import { getSessionUser } from "@/server/auth/session";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import { InstallPromptBanner } from "@/components/pwa/install-prompt";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "NEW HOTEL SURYA — Hotel Operations & Management Platform",
  description:
    "Production-grade internal operations and management platform for NEW HOTEL SURYA.",
  manifest: "/manifest.webmanifest",
  applicationName: "NEW HOTEL SURYA",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NEW HOTEL SURYA",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "NEW HOTEL SURYA",
  },
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AppShell user={user}>{children}</AppShell>
          <RegisterServiceWorker />
          <InstallPromptBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}

