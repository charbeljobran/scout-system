import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import ActivityTracker from '@/components/ActivityTracker';
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
          <ActivityTracker />
          <Navbar />
          <div className="app__content">{children}</div>
        </div>
      </body>
    </html>
  );
}