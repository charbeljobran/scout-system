import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Scout Inventory',
  description: 'Scout Du Liban-MW equipment and supply tracking.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app">
          <Navbar />
          <div className="app__content">{children}</div>
          <Footer />
        </div>
      </body>
    </html>
  );
}