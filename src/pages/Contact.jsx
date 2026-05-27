import React from "react";

const contactMethods = [
  { label: "Location", value: "Lebanon, South" },
  { label: "Email", value: "xxx@sdl.lb" },
  { label: "Phone", value: "+961 xxxxxxxx" },
  { label: "Hours", value: "Mon-Sun, 9am-6pm" },
];

export default function Contact() {
  const handleSubmit = (event) => {
    event.preventDefault();
  };

  return (
    <main className="page-shell contact-page">
      <section className="contact-hero">
        <p className="eyebrow">Support</p>
        <h1>Get in Touch</h1>
        <p>
          Questions about equipment, supplies, or inventory access? Send the
          team a message.
        </p>
      </section>

      <section className="contact-layout">
        <aside className="contact-info-panel">
          <div>
            <p className="eyebrow">Scout Du Liban-MW</p>
            <h2>We will help you keep the gear moving.</h2>
            <p>
              Reach out for stock updates, missing item reports, equipment
              requests, or account support.
            </p>
          </div>

          <div className="contact-methods">
            {contactMethods.map((method) => (
              <div className="contact-method" key={method.label}>
                <span>{method.label}</span>
                <strong>{method.value}</strong>
              </div>
            ))}
          </div>
        </aside>

        <section
          className="panel form-card contact-form-card accent-red"
          aria-label="Contact form"
        >
          <div className="form-card__header">
            <h2>Send a Message</h2>
            <p>We usually reply during scout office hours.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                Full name
                <input type="text" placeholder="Your full name" />
              </label>

              <label>
                Email
                <input type="email" placeholder="Your email address" />
              </label>
            </div>

            <label>
              Subject
              <input type="text" placeholder="Subject of your message" />
            </label>

            <label>
              Message
              <textarea placeholder="Your message" rows="5" />
            </label>

            <button className="button button--primary" type="submit">
              Send Message
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
