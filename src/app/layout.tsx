import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import CookieConsent from "@/components/privacy/CookieConsent";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "FairPlace | Encontre o que é feito por perto",
  description: "Descubra pequenos vendedores, produtos e histórias da sua região.",
  icons: {
    icon: "/fp-favicon.svg",
    shortcut: "/fp-favicon.svg",
    apple: "/fp-favicon.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a className="skip-link" href="#conteudo-principal">Pular para o conteúdo principal</a>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
