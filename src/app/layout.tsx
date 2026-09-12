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
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NEW HOTEL SURYA",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/icons/apple-touch-icon.png",
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

