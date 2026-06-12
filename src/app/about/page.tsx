const cards = [
  {
    title: 'Who We Are',
    text: 'We are a Lebanese scout group committed to developing young leaders through outdoor activities, teamwork, and community service.',
  },
  {
    title: 'Our Mission',
    text: 'To empower youth through scouting values, discipline, loyalty, and service. Every scout deserves the right tools to thrive in every adventure.',
  },
  {
    title: 'What We Track',
    text: 'From tents and ropes to first aid kits and uniforms, our inventory system keeps track of all equipment, making sure nothing is lost or forgotten.',
  },
];

export default function About() {
  return (
    <main className="page-shell">
      <section className="hero">
        <img src="/sdlmwm-logo.jpg" alt="Scout Du Liban" width="100" height="100" />
        <h1>About Scout Inventory</h1>
        <p>Scout Du Liban-MW, serving with honor since 1998</p>
      </section>

      <section className="card-grid" aria-label="About Scout Inventory">
        {cards.map((card) => (
          <article className="panel info-card accent-red" key={card.title}>
            <h2>{card.title}</h2>
            <p>{card.text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
