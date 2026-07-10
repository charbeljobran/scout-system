# Scout Inventory

A Next.js inventory dashboard for Scout Du Liban-MW, built with TypeScript.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Email 2FA

Run `supabase/email_mfa.sql` in Supabase to create the email-based 2FA tables. The app recommends Resend for sending the one-time codes:

```bash
RESEND_API_KEY=your_resend_api_key
MFA_EMAIL_FROM="Scout Inventory <security@your-domain.com>"
EMAIL_MFA_SECRET=use_a_long_random_secret
```

Without `RESEND_API_KEY`, development builds print the code in the server console for local testing. Production requires the key.

## Project Structure

- `src/app/` contains the Next.js app router pages and root layout.
- `src/components/` contains shared UI.
- `src/app/globals.css` contains the app styling.
- `src/data/` and `src/lib/` contain typed data and Supabase helpers.
