import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Alphabet Soup',
  description:
    'Stir up words in a cozy kitchen. Connect letters, collect rewards, and keep the fire from the bottom.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
