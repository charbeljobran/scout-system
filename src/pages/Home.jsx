import React from "react";
import { Link } from "react-router-dom";

const stats = [
  { label: "Total Items", value: 24, tone: "red" },
  { label: "In Use", value: 8, tone: "gold" },
  { label: "Low Stock", value: 3, tone: "orange" },
  { label: "Available", value: 13, tone: "green" },
];

const quickLinks = [
  {
    href: "/inventory",
    title: "Inventory",
    text: "View and manage all scout equipment and supplies.",
  },
  {
    href: "/about",
    title: "About Us",
    text: "Learn more about Scout Du Liban and our mission.",
  },
  {
    href: "/contact",
    title: "Contact",
    text: "Get in touch with us for any questions or support.",
  },
];

export default function Home() {
  return (
    <main className="page-shell">
      <section className="stats-grid" aria-label="Inventory overview">
        {stats.map((stat) => (
          <article
            className={`panel stat-card accent-${stat.tone}`}
            key={stat.label}
          >
            <p className="eyebrow">{stat.label}</p>
            <p className="stat-card__value">{stat.value}</p>
          </article>
        ))}
      </section>

      <div className="section-header">
        <h1>Welcome</h1>
        <Link className="button button--primary" to="/inventory">
          Go to Inventory
        </Link>
      </div>

      <section className="panel quick-links" aria-label="Quick links">
        {quickLinks.map((link) => (
          <Link className="quick-link" to={link.href} key={link.href}>
            <h2>{link.title}</h2>
            <p>{link.text}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
