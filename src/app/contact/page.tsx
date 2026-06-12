'use client';

import type { FormEvent } from 'react';

const contactMethods = [
  { label: 'Email', value: 'charbeljobran7@gmail.com' },
  { label: 'Phone', value: '+961 81057117' },

];

export default function Contact() {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <main className="page-shell contact-page">
      
      

      <section className="contact-layout">
        <aside className="contact-info-panel">

          <div className="contact-methods">
            {contactMethods.map((method) => (
              <div className="contact-method" key={method.label}>
                <span>{method.label}</span>
                <strong>{method.value}</strong>
              </div>
            ))}
          </div>
        </aside>

        <section className="panel form-card contact-form-card accent-red" aria-label="Contact form">
          <div className="form-card__header">
            <h2>Send a Message</h2>
            
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
              <textarea placeholder="Your message" rows={5} />
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
