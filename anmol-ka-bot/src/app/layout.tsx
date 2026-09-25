import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Anmol-Ka-Bot — Your AI Job Hunting Agent',
  description: 'Every morning: 20 fresh job matches, each with a resume tailored for it. Delivered to your inbox.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
