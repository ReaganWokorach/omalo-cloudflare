# Setup Guide — Omalo Graphics Website on Cloudflare

This site is fully built and tested, but a few things need setup only you
can do (Cloudflare account, form alert email, domain linking). Everything
below is one-time. Follow it top to bottom before going live.

Since the domain is already registered through Cloudflare, this setup is
now all in one place: Cloudflare Pages hosts the site, Cloudflare DNS
points the domain at it, and Cloudflare Email Service sends the contact
form alert. One dashboard, no third-party services, no extra accounts.

---

## 1. Deploy the site to Cloudflare Pages

1. Push this folder to a GitHub or GitLab repo (Cloudflare Pages deploys
   from Git; you can also drag-and-drop a build for a one-off, but Git is
   better long-term since every push auto-deploys).
2. Cloudflare dashboard → **Compute (Workers & Pages) → Create → Pages →
   Connect to Git**, and select the repo.
3. Build settings:
   - **Framework preset:** None
   - **Build command:** leave empty — nothing to build. HTML/CSS/JS are
     already committed as-is (CSS/JS are pre-minified).
   - **Build output directory:** `/` (the repo root)
4. Deploy. Your site is live at `<project-name>.pages.dev` right away.
5. This project also ships a `wrangler.toml`, which declares the `EMAIL`
   binding the contact form depends on (step 2 below). Cloudflare Pages
   reads this automatically on deploy — you don't need to run any
   `wrangler` commands yourself unless you want to test locally.

---

## 2. Turn on the contact form's email alert

Unlike Netlify, Cloudflare Pages doesn't have a built-in form-to-email
feature — instead this site includes its own small Pages Function at
`functions/api/contact.js`, which sends the alert using **Cloudflare
Email Service** (Compute → Email Service in the dashboard). This keeps
everything inside Cloudflare: no SendGrid, Resend, Mailgun or API key
from anywhere else.

Here's how the pieces fit together:

- `contact.html`'s form posts to `/api/contact`.
- `functions/api/contact.js` (a Cloudflare Pages Function) receives that
  submission, checks the honeypot field, and calls Cloudflare's Email
  Service through the `EMAIL` binding declared in `wrangler.toml`.
- Email Service actually sends the email, from an address on your
  domain, to the inbox you want alerts sent to.

### 2.1 Onboard your domain to Email Service

1. Cloudflare dashboard → **Compute → Email Service → Email Sending →
   Onboard Domain**.
2. Choose `omalographics.com` (must already be on Cloudflare DNS, which
   it is, since it's registered there).
3. Follow the prompts to confirm the DNS records Cloudflare adds for
   sending (SPF/DKIM-style records) — this happens automatically since
   Cloudflare manages your DNS.

### 2.2 Verify the inbox that should receive alerts

1. Still in **Email Service**, add and verify a **Destination Address** —
   the real inbox you check (Gmail, Workspace, whatever). You'll get a
   confirmation email with a verification link; click it.
2. Only verified destination addresses can receive mail sent through the
   binding, so this step is required, not optional.

### 2.3 Set the two environment variables the function needs

1. Cloudflare dashboard → your Pages project → **Settings →
   Environment variables**.
2. Add for **Production** (and Preview, if you want test deploys to work
   too):
   - `ALERT_TO_EMAIL` → the inbox you verified in step 2.2, e.g.
     `you@gmail.com`
   - `ALERT_FROM_EMAIL` → an address on the domain you onboarded in step
     2.1, e.g. `alerts@omalographics.com` (it doesn't need to be a real
     mailbox — it's just the "from" address Email Service is allowed to
     send as, because the domain is onboarded)
3. Redeploy (or trigger a new deploy) so the Function picks up the new
   variables — Pages Functions read environment variables at request
   time, but a fresh deploy is the simplest way to make sure they're
   attached.

> **Note on spam protection:** the form has a hidden honeypot field
> (`website`), wired up two ways — the Pages Function silently accepts
> (but discards) any submission that fills it, since bots tend to fill
> every field they find, and the same check also happens client-side in
> `js/script.js` for a fast, no-network-request rejection. Between the
> two, this covers basic and moderate bot traffic without needing a
> CAPTCHA. If real spam gets through later, Cloudflare Turnstile (free)
> is the natural next layer to add to the form.

---

## 3. Test the contact form before launch

Once step 2 is done and the site is deployed:

1. Open your live URL → Contact page → submit the form yourself with a
   real message.
2. Confirm the email alert arrives at the inbox you set as
   `ALERT_TO_EMAIL`.
3. If it doesn't arrive:
   - Cloudflare dashboard → your Pages project → **Functions** (or the
     **Logs** tab) — check for errors from `/api/contact`. The function
     logs a clear message if `ALERT_TO_EMAIL`, `ALERT_FROM_EMAIL`, or the
     `EMAIL` binding aren't set up correctly.
   - Double-check the destination address is actually verified (Email
     Service → Destination Addresses) and that the domain shows as fully
     onboarded under Email Sending.
   - Check spam in the alert inbox.

**If submissions fail outright:** open your browser's dev tools →
Network tab, resubmit the form, and look at the response from
`/api/contact` — it returns a JSON `{ "ok": false, "error": "..." }`
with a human-readable reason, which is also what's shown in the form's
status message.

---

## 4. Point your domain at Cloudflare Pages

Since the domain is already on Cloudflare (registrar and DNS both), this
is the simplest part — everything is in one dashboard.

1. Cloudflare dashboard → your Pages project → **Custom domains → Set up
   a custom domain**, enter `omalographics.com`.
2. Because the domain's nameservers are already Cloudflare's, Cloudflare
   adds the required DNS record(s) for you automatically — there's no
   manual A/CNAME record entry and no nameserver change needed.
3. Repeat for `www.omalographics.com` if you want both the bare domain
   and `www` to work — Cloudflare will offer to set up a redirect
   between them.
4. HTTPS provisions automatically within a few minutes. The dashboard
   shows the domain's status change to **Active** once it's ready.

---

## 5. After you edit `css/styles.css` or `js/script.js`

The site ships minified copies (`styles.min.css`, `script.min.js`) that
the HTML actually loads, for speed. Regenerate them after any edit:

```bash
npm install
npm run minify
```

Commit both the source files and the regenerated `.min` files, and bump
the `?v=` number on the affected `<link>`/`<script>` tags across all HTML
pages so visitors' browsers don't keep serving a cached, out-of-date
copy.

---

## 6. If you add new external resources later

The Content-Security-Policy in `_headers` only allows scripts/styles/
images/fonts from a specific, tight list of origins (itself, Google
Fonts, Google Maps). If you embed something new — a video, a booking
widget, another analytics tool, Cloudflare Turnstile for the form — it
will be **silently blocked** by the browser until you add its origin to
the matching directive in `_headers`. Check the browser console for a
"Refused to ... because it violates the following Content Security
Policy directive" message if something you add stops working.

The `/api/*` route used by the contact form is same-origin, so it
already works under `connect-src 'self'` with no CSP changes needed.

---

## 7. Quick pre-launch checklist

- [ ] Site deployed on Cloudflare Pages and loading at the `.pages.dev` URL (step 1)
- [ ] Domain onboarded to Email Service and DNS records confirmed (step 2.1)
- [ ] Alert inbox added and verified as a Destination Address (step 2.2)
- [ ] `ALERT_TO_EMAIL` and `ALERT_FROM_EMAIL` set in Pages environment variables, and a fresh deploy triggered (step 2.3)
- [ ] Test submission received by email (step 3)
- [ ] Custom domain added in Pages, HTTPS shows as Active (step 4)
- [ ] Replace the social media `href="#"` placeholders in the footer with your real profile links, if any still remain
- [ ] Replace the placeholder phone numbers / email on the Contact page and in the footer with your real ones, if any still remain
- [ ] If you get a more precise street address for the Kampala location, add it to the Contact page (locations list + map) and the footer
