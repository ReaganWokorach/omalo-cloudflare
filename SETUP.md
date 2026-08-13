# Setup Guide — Omalo Graphics Website on Cloudflare Pages

This site is fully built and tested, but a few things need setup only you
can do (Cloudflare account, Email Service, environment variables, domain).
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

## 2. Turn on Cloudflare Email Service (for the contact form)

1. Dashboard → **Compute & AI → Email Service → Email Sending**.
2. Select **Onboard Domain** and choose your domain. Cloudflare adds a
   couple of DNS records automatically (SPF, DKIM, DMARC) since your domain
   is on Cloudflare DNS.
3. DNS changes usually complete within 5–15 minutes, but can take up to 24
   hours to fully propagate.
4. Verify the **destination address** you want enquiries sent to (the inbox
   you'll actually read — e.g. your Gmail or Workspace address). You'll get
   a confirmation email to click.
5. Create an API token for sending: Dashboard → click your profile icon (top
   right) → **My Profile → API Tokens → Create Token → Custom token**. Give
   it the **Email Service Send** permission, scoped to your account. Copy
   the token immediately — Cloudflare only shows it once.
   > This project uses Email Service's REST API rather than the
   > `send_email` Workers binding, because **Pages Functions don't support
   > that binding** — it's Workers-only, whether configured via
   > `wrangler.toml` or the dashboard. If you (or anyone editing this
   > later) try to add `[[send_email]]` to `wrangler.toml` on a Pages
   > project, the deploy will fail with: "Configuration file for Pages
   > projects does not support 'send_email'". The REST API is Cloudflare's
   > documented alternative for exactly this case, and it's what
   > `functions/api/contact.js` already uses — no further changes needed
   > here, just the token.
6. Find your **Account ID**: Dashboard → any page in your account → the
   Account ID is shown in the right-hand sidebar (or under **Workers &
   Pages → Overview**). Copy it.

> **Bonus over the previous setup:** because this sends from your own
> domain (`noreply@omalographics.com` or similar) with proper SPF/DKIM
> from Email Service, notification emails are much less likely to land in
> spam than a generic third-party notification sender would.

---

## 3. Set environment variables for the main site

Dashboard → your Pages project → **Settings → Environment variables**.

| Name | Type | Value |
|---|---|---|
| `CONTACT_EMAIL_TO` | Plaintext | The inbox you verified in step 2 |
| `CONTACT_EMAIL_FROM` | Plaintext | e.g. `noreply@omalographics.com` (must be on the domain you onboarded to Email Service) |
| `CF_ACCOUNT_ID` | Plaintext | The Account ID from step 2.6 |
| `CF_EMAIL_API_TOKEN` | **Secret (encrypt)** | The API token from step 2.5 — never commit this to the repo |

Set these for both **Production** and **Preview** environments. Redeploy
after saving (env var changes need a new deployment to take effect).

> `wrangler.toml` also has placeholder values for `CONTACT_EMAIL_TO` /
> `CONTACT_EMAIL_FROM` / `CF_ACCOUNT_ID` — those are just local-dev
> fallbacks and are safe to commit since none of them are secret. The
> dashboard values above are what production actually uses.
> `CF_EMAIL_API_TOKEN` must never go in `wrangler.toml` — set it only as
> an encrypted secret in the dashboard, or via `wrangler pages secret put
> CF_EMAIL_API_TOKEN`.

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
   `functions/api/contact.js` (bad API token, wrong account ID, unverified
   sender, missing env vars, etc.) show up there immediately.

---

## 5. Point your domain at the site

1. Dashboard → your Pages project → **Custom domains → Set up a custom
   domain**, enter your domain.
2. If the domain is already on Cloudflare DNS (which it will be, since
   Email Service in step 2 requires that anyway), Cloudflare adds the
   necessary DNS record and provisions HTTPS automatically — usually
   within a few minutes.
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

- [ ] Email Service onboarded + destination address verified (step 2.1–2.4)
- [ ] API token created with Email Service Send permission (step 2.5)
- [ ] Account ID copied (step 2.6)
- [ ] `CONTACT_EMAIL_TO` / `CONTACT_EMAIL_FROM` / `CF_ACCOUNT_ID` / `CF_EMAIL_API_TOKEN` set in Pages dashboard (step 3)
- [ ] Submitted the contact form yourself once, confirmed you receive the email — and it's not in spam (step 4)
- [ ] Custom domain attached, site loads over `https://` (step 5)
- [ ] Replace the social media `href="#"` placeholders in the footer with your real profile links
- [ ] Replace the placeholder phone numbers / email on the Contact page and in the footer with your real ones
- [ ] If you get a real street address for the Kampala location, swap it in on the Contact page (locations list + map) and in the footer
