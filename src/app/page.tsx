import Link from 'next/link';

type Feature = {
  href: string;
  title: string;
  accent: string;
  emoji: string;
};

const features: Feature[] = [
  {
    href: '/inventory/intendant',
    title: 'Intendant',

    accent: 'accent-orange',
    emoji: '🍳',
  },
  {
    href: '/inventory/materiel',
    title: 'Gérant de Matériel',
    accent: 'accent-green',
    emoji: '🎒',
  },
];

export default function Home() {
  return (
    <main className="landing-shell">
      <div className="landing-header">
        <img src="/sdlmwm-logo.jpg" alt="Scout Du Liban" width="72" height="72" />
        <h1>Scout Inventory</h1>
        <p>Select a section to get started</p>
      </div>

      <div className="landing-grid">
        {features.map((feature) => (
          <Link key={feature.href} href={feature.href} className={`landing-card panel ${feature.accent}`}>
            <span className="landing-card__emoji">{feature.emoji}</span>
            <h2 className="landing-card__title">{feature.title}</h2>
          </Link>
        ))}

        {/* Contact — always last */}
        <Link href="/contact" className="landing-card panel accent-red landing-card--contact">
          <span className="landing-card__emoji">📬</span>
          <h2 className="landing-card__title">Contact</h2>
          
        </Link>
      </div>
    </main>
  );
}