import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aprovação de produtos | Shopee Afiliado",
  description: "Revise, aprove ou rejeite produtos antes de publicar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-fundo text-tinta antialiased">{children}</body>
    </html>
  );
}
