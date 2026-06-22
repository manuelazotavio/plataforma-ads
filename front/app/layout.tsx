import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavigationProgress from "@/app/components/NavigationProgress";
import SuspendedUserGuard from "@/app/components/SuspendedUserGuard";
import VLibrasWidget from "@/app/components/VLibrasWidget";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "ADS Conecta",
  description: "A plataforma dos alunos de ADS",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-white">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}",
          }}
        />
        <SuspendedUserGuard />
        <NavigationProgress />
        <div id="a11y-content" className="flex min-h-full flex-1 flex-col">
          {children}
        </div>
        <VLibrasWidget />
      </body>
    </html>
  );
}
