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

There are two separate things to set up in Resend, and the form needs
**both** before it will work: a verified domain, and an API key. Missing
either one is the most common reason the form fails.

### 2.1 Create your account

Sign up at [resend.com](https://resend.com) (free, no card required). Use
an email address you'll keep — see the note in 2.6 about why this matters
early on.

### 2.2 Add your domain

1. In the left sidebar, click **Domains**.
2. Click **Add Domain**.
3. Enter your domain — e.g. `omalographics.com`. You can use the bare
   domain or a subdomain (some people use `mail.omalographics.com` to keep
   sending separate from other email on the domain — either works fine for
   this project).
4. Pick a region (any region close to your users is fine; it doesn't
   affect functionality, only where Resend's sending servers sit).
5. Click **Add**. Resend now shows you a table of DNS records to add — an
   **MX** record, one or two **TXT** records (SPF and a Resend
   verification record), and a **DKIM** record (TXT or CNAME depending on
   the account). Leave this tab open — you'll copy from it in the next step.

### 2.3 Add the DNS records at your domain's DNS provider

Where you do this depends on who manages your domain's DNS — **not**
necessarily Cloudflare, even though the site is hosted there:

- **If your domain's DNS is on Cloudflare:** Cloudflare dashboard →
  select the domain → **DNS → Records → Add record**. Add each row Resend
  showed you: same **Type**, same **Name**, same **Content/Value**. For
  the MX record, also set the **Priority** Resend gives you (commonly
  `10`). Leave Cloudflare's proxy toggle (the orange cloud) **off/grey**
  for these records — mail records must resolve directly, not through
  Cloudflare's proxy.
- **If your domain's DNS is elsewhere** (GoDaddy, Namecheap, your
  registrar, etc.): add the same records there instead, in that
  provider's DNS records screen.

Copy every value **exactly** as Resend shows it — a trailing dot, a
missing character, or a swapped Name/Value is the single most common
cause of a domain staying stuck on "Pending." Resend's own guide
recommends copy-pasting rather than retyping for this reason.

### 2.4 Verify the domain

1. Back on the Resend **Domains** page, click into your domain and click
   **Verify DNS Records** (sometimes shown as **Check DNS**).
2. Records often verify within 15 minutes, but DNS propagation can
   occasionally take a few hours — rarely up to 72. If it's been stuck for
   over an hour, use Resend's DNS-check tool at
   [dns.email](https://dns.email) to confirm the records are visible
   publicly, and compare them character-by-character against what Resend
   asked for.
3. Don't move on until the domain shows **Verified** — an API key will
   work even with an unverified domain, but sending will fail (see 2.7).

### 2.5 Decide your "from" address

No need to create an actual inbox for this — it just needs to be
`something@yourdomain.com` on the domain you just verified (e.g.
`noreply@omalographics.com`). This is what goes in `CONTACT_EMAIL_FROM`.

### 2.6 Create the API key

1. Left sidebar → **API Keys → Create API Key**.
2. Give it a name (e.g. "Omalo Graphics website").
3. Permission: **Sending access** is enough — no need for full account
   access.
4. Click **Create**, then **copy the key immediately** — Resend only
   displays it once. This is what goes in `RESEND_API_KEY` (as a secret,
   step 3).

### 2.7 Know the free-tier sending restriction

Until your domain shows **Verified**, Resend's free tier will only
deliver to the email address you signed up with in 2.1 — sending to any
other `CONTACT_EMAIL_TO` will fail silently from the visitor's point of
view (the form shows the generic error) but will show a clear rejection
reason in **Resend Dashboard → Logs**. Once the domain is verified, you
can send to any destination address.

### 2.8 Decide the destination inbox

The real address you want enquiries delivered to (your Gmail, Workspace
address, etc.) — this is `CONTACT_EMAIL_TO`. No separate verification
step needed here on Resend's side once your domain is verified.

---

## 3. Set environment variables for the main site

Dashboard → your Pages project → **Settings → Environment variables**.

| Name | Type | Value |
|---|---|---|
| `CONTACT_EMAIL_TO` | Plaintext | The destination inbox from step 2.8 |
| `CONTACT_EMAIL_FROM` | Plaintext | e.g. `noreply@omalographics.com` (must be on the domain you verified in Resend) |
| `RESEND_API_KEY` | **Secret (encrypt)** | The API key from step 2.6 — never commit this to the repo |

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
   `functions/api/contact.js` show up there immediately. Resend's own
   **Dashboard → Logs** also shows every send attempt and the exact
   rejection reason, which is usually more specific than the Cloudflare log.

### If the form shows "Something went wrong sending your message"

That message covers every failure case, so check in this order:

| Symptom in Resend Dashboard → Logs (or Cloudflare Function logs) | Cause | Fix |
|---|---|---|
| No log entry appears in Resend at all | `RESEND_API_KEY` isn't set, or the site wasn't redeployed after adding it | Re-check step 3, then redeploy |
| `401 Unauthorized` / invalid API key | Key mistyped, or created before being copied correctly | Create a fresh key (2.6), update the Pages secret, redeploy |
| `403` / domain not verified, or delivery only reaching your signup address | Domain still Pending, or you're sending to an address that isn't your Resend signup email | Finish domain verification (2.3–2.4); once Verified, any `CONTACT_EMAIL_TO` works |
| `422` validation error mentioning `from` | `CONTACT_EMAIL_FROM` isn't on the verified domain, or has a typo | Match it exactly to the domain verified in 2.4 |
| `429` rate limited | Too many test submissions in quick succession (free tier caps ~2/sec) | Wait 60 seconds and retry |
| Cloudflare log shows `"Server is not configured"` | One of `RESEND_API_KEY` / `CONTACT_EMAIL_TO` / `CONTACT_EMAIL_FROM` is missing | Re-check all three are set in step 3 for the right environment (Production vs Preview), then redeploy |

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

- [ ] Resend account created (2.1), domain added (2.2), DNS records added at the DNS provider (2.3), domain shows Verified (2.4)
- [ ] API key created with sending access (2.6)
- [ ] `CONTACT_EMAIL_TO` / `CONTACT_EMAIL_FROM` / `RESEND_API_KEY` set in Pages dashboard (step 3)
- [ ] Submitted the contact form yourself once, confirmed you receive the email — and it's not in spam (step 4)
- [ ] Custom domain attached, site loads over `https://` (step 5)
- [ ] Replace the social media `href="#"` placeholders in the footer with your real profile links
- [ ] Replace the placeholder phone numbers / email on the Contact page and in the footer with your real ones
- [ ] If you get a real street address for the Kampala location, swap it in on the Contact page (locations list + map) and in the footer
