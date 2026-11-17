import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Engxam — подготовка к экзамену",
  description: "Источники и словарь для подготовки к кандидатскому экзамену",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const value = (await cookies()).get("engxam-theme")?.value;
  const theme = value === "dark" || value === "light" ? value : undefined;
  return <html lang="ru" data-theme={theme}>
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&display=swap" />
    </head>
    <body>
    <ThemeProvider initialTheme={theme}>
      <a className="skip-link" href="#main">Перейти к содержимому</a>
      {children}
    </ThemeProvider>
  </body></html>;
}
