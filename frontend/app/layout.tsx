import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SMobile — Buy & Sell Phones",
  description:
    "Enterprise marketplace for buying and selling new & used phones. Find the best deals on smartphones near you.",
  keywords: ["phones", "marketplace", "buy phones", "sell phones", "used phones", "new phones"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          {/* Footer will be inserted here */}
        </Providers>
      </body>
    </html>
  );
}

