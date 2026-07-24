import './globals.css';

export const metadata = {
  title: 'Sencha',
  description: 'Your matcha pop-up hub — track orders, inventory, and income.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
