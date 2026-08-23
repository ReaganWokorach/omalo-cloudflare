# Setup Guide — Omalo Graphics Website on Cloudflare Pages

This site is fully built and tested, but a few things need setup only you
can do (Cloudflare account, Resend account, environment variables, domain).
Everything below is one-time. Follow it top to bottom before going live.

---

## 1. Deploy the site to Cloudflare Pages

1. Push this folder to a GitHub/GitLab repo (or use direct upload).
2. In the Cloudflare dashboard: **Compute & AI → Workers & Pages → Create →
   Pages → Connect to Git**, select the repo.
3. Build settings:
   - **Build command:** leave empty (nothing to build — HTML/CSS/JS are already
     minified and committed).
   - **Build output directory:** `/`
4. Deploy. Your site will be live at `<project>.pages.dev` immediately —
   custom domain comes in step 5. The Pages Function in `functions/api/
   contact.js` deploys automatically along with the static site, no extra
   configuration needed for that part.

---

## 2. Set up Resend (for the contact form)

This project sends the contact-form notification email through
[Resend](https://resend.com) rather than Cloudflare's own Email Service —
Resend's setup is simpler (one API key, no per-Cloudflare-account onboarding
step) and it has a free tier that's plenty for a low-volume contact form.

1. Create a free account at [resend.com](https://resend.com).
2. Dashboard → **Domains → Add Domain**, enter your domain. Resend gives you
   a few DNS records to add (SPF, DKIM, and optionally DMARC).
3. Add those records at your DNS provider. If your domain's DNS is on
   Cloudflare, add them under **DNS → Records** in the Cloudflare dashboard.
   Verification is usually quick (minutes), occasionally up to a few hours.
4. Once the domain shows **Verified** in Resend, decide the "from" address
   you'll send as — it just needs to be `something@yourdomain.com` on the
   verified domain (e.g. `noreply@omalographics.com`); Resend doesn't
   require that specific inbox to exist.
5. Create an API key: Dashboard → **API Keys → Create API Key**. Sending
   access is enough — no need for full account access. Copy the key
   immediately; Resend only shows it once.
6. Decide the destination inbox — the real address you want enquiries
   delivered to (your Gmail, Workspace address, etc.). No verification step
   needed on the receiving end with Resend.

---

## 3. Set environment variables for the main site

Dashboard → your Pages project → **Settings → Environment variables**.

| Name | Type | Value |
|---|---|---|
| `CONTACT_EMAIL_TO` | Plaintext | The destination inbox from step 2.6 |
| `CONTACT_EMAIL_FROM` | Plaintext | e.g. `noreply@omalographics.com` (must be on the domain you verified in Resend) |
| `RESEND_API_KEY` | **Secret (encrypt)** | The API key from step 2.5 — never commit this to the repo |

Set these for both **Production** and **Preview** environments. Redeploy
after saving (env var changes need a new deployment to take effect).

> `wrangler.toml` also has placeholder values for `CONTACT_EMAIL_TO` /
> `CONTACT_EMAIL_FROM` — those are just local-dev fallbacks and are safe to
> commit since neither is secret. The dashboard values above are what
> production actually uses. `RESEND_API_KEY` must never go in
> `wrangler.toml` — set it only as an encrypted secret in the dashboard, or
> via `wrangler pages secret put RESEND_API_KEY`.

> **Note on spam protection:** this form has no CAPTCHA (Turnstile was
> removed earlier in this project's history). The only spam defense is a
> honeypot field, which stops basic bots but not a determined human or a
> well-built scraper. If you start getting spam through the form, consider
> adding Turnstile back, or ask for rate-limiting to be added to
> `functions/api/contact.js`.

---

## 4. Test the contact form before launch

Once steps 2–3 are done and redeployed:

1. Open your `.pages.dev` URL → Contact page → submit the form yourself
   with a real message.
2. Confirm the email arrives at the inbox you set as `CONTACT_EMAIL_TO`.
   Check spam/junk the first time — mark it "Not spam" if it lands there,
   which should fix future delivery.
3. If it doesn't arrive at all, check **Workers & Pages → your project →
   Functions → Real-time Logs** while you submit again — errors from
   `functions/api/contact.js` (bad API key, unverified sending domain,
   missing env vars, etc.) show up there immediately. Resend's own
   **Dashboard → Logs** also shows every send attempt and why it failed.

---

## 5. Point your domain at the site

1. Dashboard → your Pages project → **Custom domains → Set up a custom
   domain**, enter your domain.
2. If the domain's DNS is already on Cloudflare, Cloudflare adds the
   necessary DNS record and provisions HTTPS automatically — usually
   within a few minutes. If DNS lives elsewhere, Cloudflare will show you a
   record to add there instead (unrelated to the Resend records from step 2,
   which live on the domain's DNS regardless of where it's hosted).
3. Repeat for `www.yourdomain.com` if you want both the bare domain and
   `www` to work; Cloudflare will offer to set up the redirect.

---

## 6. After you edit `css/styles.css` or `js/script.js`

The site ships minified copies (`styles.min.css`, `script.min.js`) that the
HTML actually loads, for speed. Regenerate them after any edit:

```bash
npm install
npm run minify
```

Commit both the source files and the regenerated `.min` files, and bump the
`?v=` number on the affected `<link>`/`<script>` tags across all HTML pages
so visitors' browsers don't keep serving a cached, out-of-date copy.

---

## 7. If you add new external resources later

The Content-Security-Policy in `_headers` only allows scripts/styles/images/
fonts from a specific, tight list of origins (itself, Google Fonts,
Google Maps). If you embed something new — a video, a booking widget,
another analytics tool — it will be **silently blocked** by the browser
until you add its origin to the matching directive in `_headers`. Check the
browser console for a "Refused to ... because it violates the following
Content Security Policy directive" message if something you add stops
working.

---

## 8. Quick pre-launch checklist

- [ ] Resend account created, domain added and verified (step 2.1–2.3)
- [ ] API key created with sending access (step 2.5)
- [ ] `CONTACT_EMAIL_TO` / `CONTACT_EMAIL_FROM` / `RESEND_API_KEY` set in Pages dashboard (step 3)
- [ ] Submitted the contact form yourself once, confirmed you receive the email — and it's not in spam (step 4)
- [ ] Custom domain attached, site loads over `https://` (step 5)
- [ ] Replace the social media `href="#"` placeholders in the footer with your real profile links
- [ ] Replace the placeholder phone numbers / email on the Contact page and in the footer with your real ones
- [ ] If you get a real street address for the Kampala location, swap it in on the Contact page (locations list + map) and in the footer
