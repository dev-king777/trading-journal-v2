import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "draga4life — Premium Trading Journal",
  description: "The most beautiful trading journal ever created by El Houssaine Bourase. Document every trade, review mistakes, improve psychology, and track your progress.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
