import type { Metadata, Viewport } from "next";
import { Figtree, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { ServiceWorkerRegistration } from "@/components/layout/service-worker-registration";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Sonner copies the string into its --offset-bottom / --mobile-offset-bottom
// custom properties, so the geometry stays in globals.css.
const TOAST_OFFSET = { bottom: "var(--toast-offset-bottom)" };

export const metadata: Metadata = {
  title: "Métricas Bebé",
  description:
    "Registro rápido de tomas, pañales, sueño, crecimiento y salud del bebé.",
  // Installed from Safari's "Añadir a pantalla de inicio", iOS opens it
  // full screen with this name (decision 072). The default status bar keeps
  // its text readable in both themes; the safe areas are already handled.
  appleWebApp: {
    capable: true,
    title: "Métricas Bebé",
    statusBarStyle: "default",
  },
  // Dates and amounts are not phone numbers.
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Mirrors --background in globals.css; the meta tag cannot read CSS variables.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">): ReactNode {
  return (
    // next-themes sets the theme class before hydration, so React must not
    // flag the server/client className mismatch on <html>.
    <html
      lang="es"
      suppressHydrationWarning
      className={cn(
        "h-full font-sans antialiased",
        figtree.variable,
        geistMono.variable,
      )}
    >
      <body className="flex min-h-dvh flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          {/* Above the bottom bar, on phones (mobileOffset) and on wider
              screens, where the bar still spans the full width. */}
          <Toaster offset={TOAST_OFFSET} mobileOffset={TOAST_OFFSET} />
        </ThemeProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
