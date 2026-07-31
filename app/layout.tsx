import type { Metadata } from "next";
import { Anton, Archivo } from "next/font/google";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  title: "FIT EVOLUTION — Tu cambio empieza hoy",
  description:
    "Gimnasio FIT EVOLUTION en Quinta Normal: equipamiento moderno, coaches que te guían y planes claros. San Pablo 4842, a pasos de Metro Blanqueado L5.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${anton.variable} ${archivo.variable} grain antialiased`}>
        {children}
      </body>
    </html>
  );
}
