# Setup Guide — Omalo Graphics Website on Cloudflare

This site is fully built and tested, but a few things need setup only you
can do (Cloudflare account, form alert email, domain linking). Everything
below is one-time. Follow it top to bottom before going live.

Since the domain is already registered through Cloudflare, hosting and
DNS stay in one place: Cloudflare Pages hosts the site and Cloudflare
DNS points the domain at it. The contact form's email alert is sent
through **Resend** (resend.com) — a free, developer-friendly email API
that's simpler to set up and monitor than Cloudflare's own Email
Service, at no cost for this site's volume.

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
5. This project also ships a `wrangler.toml` with basic project settings.
   You don't need to run any `wrangler` commands yourself unless you want
   to test locally — Cloudflare Pages reads it automatically on deploy.

---

## 2. Turn on the contact form's email alert

Cloudflare Pages doesn't have a built-in form-to-email feature — instead
this site includes its own small Pages Function at
`functions/api/contact.js`, which sends the alert using **Resend**
(resend.com). Resend's free plan is generous for a site like this
(3,000 emails/month, 100/day), gives you a dashboard of every send with
delivery status, and needs only one API key — no Cloudflare-side email
product to configure at all.

Here's how the pieces fit together:

- `contact.html`'s form posts to `/api/contact`.
- `functions/api/contact.js` (a Cloudflare Pages Function) receives that
  submission, checks the honeypot field, and calls Resend's REST API
  (`https://api.resend.com/emails`) over `fetch()`, authenticated with
  an API key.
- Resend sends the email, from an address on your domain, to the
  inbox(es) you want alerts sent to.

### 2.1 Create a free Resend account and verify your domain

1. Go to [resend.com](https://resend.com) and sign up (free, no card
   required).
2. In the Resend dashboard → **Domains → Add Domain**, enter
   `omalographics.com`.
3. Resend shows you a handful of DNS records to add (SPF, DKIM, and a
   tracking/return-path record). Add these in the Cloudflare dashboard
   → your domain → **DNS → Records** — copy each record's type, name,
   and value exactly as Resend shows them.
4. Back in Resend, click **Verify DNS Records**. This can take a few
   minutes to a few hours to propagate; Resend shows a green
   **Verified** status once it's done. Test sends will fail with an
   error until this shows Verified.

### 2.2 Create an API key

1. Resend dashboard → **API Keys → Create API Key**.
2. Name it something like `omalo-contact-form`, and set permission to
   **Sending access** (it doesn't need full account access).
3. Copy the key now — Resend only shows it once.

### 2.3 Set the environment variables the function needs

1. Cloudflare dashboard → your Pages project → **Settings →
   Environment variables**.
2. Add for **Production** (and Preview, if you want test deploys to work
   too):
   - `RESEND_API_KEY` → the key you created in step 2.2. Mark this one
     **Encrypt** so it's stored as a secret, not shown in plain text.
   - `ALERT_TO_EMAIL` → the inbox(es) you want alerts sent to.
     - One address: `you@gmail.com`
     - **Multiple addresses** (e.g. all three of your inboxes): separate
       them with commas in a single value, e.g.
       `owner@gmail.com, manager@gmail.com, sales@gmail.com`
       The Function splits this on commas itself, so every address
       listed gets the alert — you don't need to duplicate the
       variable or add extra config for this. Unlike Cloudflare's own
       Email Service, Resend does **not** require you to individually
       verify each destination inbox — any address works as soon as
       your sending domain (step 2.1) is verified.
   - `ALERT_FROM_EMAIL` → an address on the domain you verified in step
     2.1, e.g. `alerts@omalographics.com` (it doesn't need to be a real
     mailbox — it's just the "from" address Resend is allowed to send
     as, because the domain is verified there)
3. Redeploy (or trigger a new deploy) so the Function picks up the new
   variables — Pages Functions read environment variables at request
   time, but a fresh deploy is the simplest way to make sure they're
   attached.

> **Why you're seeing "The contact form is not fully set up yet"**
> right now: this is the Function's deliberate, friendly error for
> exactly one situation — one or more of `RESEND_API_KEY`,
> `ALERT_TO_EMAIL`, or `ALERT_FROM_EMAIL` isn't set on the Pages
> project yet (or a deploy hasn't happened since you set them). It's
> not a bug — the form and Function are already built and working,
> they're just waiting on steps 2.1–2.3 above to be completed once.
> Once all three variables are set and you've redeployed, this message
> goes away and real submissions send normally.

> **Note on spam protection:** the form has a hidden honeypot field
> (`website`), wired up two ways — the Pages Function silently accepts
> (but discards) any submission that fills it, since bots tend to fill
> every field they find, and the same check also happens client-side in
> `js/script.js` for a fast, no-network-request rejection.

### 2.4 Turnstile (bot-check widget) — recommended

The honeypot alone stops basic bots but not scripted/automated
submissions. The form and Function now also support **Cloudflare
Turnstile** (a free, invisible CAPTCHA alternative), but it's inactive
until you set it up — nothing breaks if you skip this step, it's just
less protected against determined spam.

1. Cloudflare dashboard → **Turnstile → Add widget**.
2. Widget settings: domain `omalographics.com` (and add the
   `.pages.dev` domain too, so it also works before your custom domain
   is live), widget mode **Managed** (the default — usually invisible
   to real visitors).
3. Turnstile gives you two keys — a **Site Key** (public) and a
   **Secret Key** (private):
   - Open `contact.html`, find the line with
     `data-sitekey="REPLACE_WITH_TURNSTILE_SITE_KEY"` in the contact
     form, and replace that placeholder with your real Site Key. This
     is meant to be public — it's fine to commit it.
   - Add `TURNSTILE_SECRET_KEY` as a new Pages environment variable
     (Settings → Environment variables), same place as the Resend
     variables from step 2.3. Mark it **Encrypt** — it's a secret.
4. Redeploy. Once `TURNSTILE_SECRET_KEY` is set, `functions/api/contact.js`
   starts rejecting any submission that fails the Turnstile check,
   before it ever reaches Resend.

If you'd rather not set this up right now, leave the placeholder as-is
and skip adding `TURNSTILE_SECRET_KEY` — the form keeps working exactly
as it does today, honeypot-only.

---

## 3. Test the contact form before launch

Once step 2 is done and the site is deployed:

1. Open your live URL → Contact page → submit the form yourself with a
   real message.
2. Confirm the email alert arrives at every inbox listed in
   `ALERT_TO_EMAIL`.
3. If it doesn't arrive:
   - Resend dashboard → **Logs** (or **Emails**) — every send attempt
     shows up here with its delivery status, which is often the fastest
     way to see what happened (sent, bounced, blocked, etc.).
   - Cloudflare dashboard → your Pages project → **Functions** (or the
     **Logs** tab) — check for errors from `/api/contact`. The function
     logs a clear message if `RESEND_API_KEY`, `ALERT_TO_EMAIL`, or
     `ALERT_FROM_EMAIL` aren't set up correctly.
   - Double-check your domain shows **Verified** in Resend → Domains —
     sends fail until it does.
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
- [ ] Resend account created and `omalographics.com` shows **Verified** under Domains (step 2.1)
- [ ] Resend API key created with sending access (step 2.2)
- [ ] `RESEND_API_KEY`, `ALERT_TO_EMAIL`, and `ALERT_FROM_EMAIL` set in Pages environment variables — `ALERT_TO_EMAIL` as a comma-separated list if using more than one inbox — and a fresh deploy triggered (step 2.3)
- [ ] (Recommended) Turnstile site key added to `contact.html` and `TURNSTILE_SECRET_KEY` set in Pages environment variables (step 2.4)
- [ ] Test submission received by **all** the email addresses listed in `ALERT_TO_EMAIL` (step 3)
- [ ] Custom domain added in Pages, HTTPS shows as Active (step 4)
- [ ] Replace the social media `href="#"` placeholders in the footer with your real profile links, if any still remain
- [ ] Replace the placeholder phone numbers / email on the Contact page and in the footer with your real ones, if any still remain
- [ ] If you get a more precise street address for the Kampala location, add it to the Contact page (locations list + map) and the footer



## 7. Turnstile and Resend APIs
For external use - Node.js on powershell
```
npm install -g wrangler
wrangler login                     # opens a browser once, to authorize the CLI
wrangler pages secret put RESEND_API_KEY --project-name=omalographics
wrangler pages secret put TURNSTILE_SECRET_KEY --project-name=omalographics
```
