import './globals.css';

export const metadata = {
  title: 'Matcha Stand',
  description: 'Track your pop-up orders, inventory, and income.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
