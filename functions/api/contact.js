/* =========================================================
   POST /api/contact
   Cloudflare Pages Function backing the contact form on
   contact.html. Validates the submission, then sends a
   notification email through Cloudflare Email Service's
   REST API.

   Note: this uses the REST API, not the send_email Workers
   binding. Pages Functions do not support that binding (it's
   Workers-only, via [[send_email]] in wrangler.toml or the
   dashboard) — the REST API is Cloudflare's documented
   alternative for exactly this case.

   Spam defense is the honeypot field only (see the "website"
   check below, mirrored client-side in js/script.js). There
   is no CAPTCHA/bot-verification step on this endpoint.

   Required environment (see SETUP.md):
     - env.CF_ACCOUNT_ID         (your Cloudflare account ID)
     - env.CF_EMAIL_API_TOKEN    (secret — API token scoped to Email Service send)
     - env.CONTACT_EMAIL_TO      (destination inbox)
     - env.CONTACT_EMAIL_FROM    (must be on your Email Service domain)
   ========================================================= */

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clean(value) {
  // Strip control characters (incl. CR/LF) to block header/content injection,
  // and collapse to a plain string.
  return String(value || '').replace(/[\r\n\x00-\x1F\x7F]/g, ' ').trim();
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let data;
  try {
    data = await request.json();
  } catch (err) {
    return json({ error: 'Invalid request body' }, 400);
  }

  // Honeypot: real visitors never see or fill this field. Any bot that
  // fills every field it finds trips this, and we quietly no-op instead
  // of sending an email, without telling the caller anything useful.
  if (clean(data.website)) {
    return json({ ok: true }, 200);
  }

  const name = clean(data.name).slice(0, 200);
  const email = clean(data.email).slice(0, 200);
  const service = clean(data.service).slice(0, 100);
  const message = String(data.message || '').slice(0, 5000).trim();

  if (!name || !email) {
    return json({ error: 'Missing required fields' }, 400);
  }

  const to = env.CONTACT_EMAIL_TO;
  const from = env.CONTACT_EMAIL_FROM;
  const accountId = env.CF_ACCOUNT_ID;
  const apiToken = env.CF_EMAIL_API_TOKEN;

  if (!to || !from || !accountId || !apiToken) {
    return json({ error: 'Server is not configured' }, 500);
  }

  const textBody =
    'New enquiry from the website contact form\n\n' +
    'Name: ' + name + '\n' +
    'Email/phone: ' + email + '\n' +
    'Service: ' + (service || 'Not specified') + '\n\n' +
    'Message:\n' +
    (message || '(no message provided)');

  const htmlBody =
    '<p>New enquiry from the website contact form</p>' +
    '<p><strong>Name:</strong> ' + escapeHtml(name) + '<br>' +
    '<strong>Email/phone:</strong> ' + escapeHtml(email) + '<br>' +
    '<strong>Service:</strong> ' + escapeHtml(service || 'Not specified') + '</p>' +
    '<p><strong>Message:</strong><br>' +
    escapeHtml(message || '(no message provided)').replace(/\n/g, '<br>') + '</p>';

  let sendResp;
  try {
    sendResp = await fetch(
      'https://api.cloudflare.com/client/v4/accounts/' + accountId + '/email/sending/send',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: to,
          from: from,
          subject: 'New enquiry from ' + name,
          text: textBody,
          html: htmlBody
        })
      }
    );
  } catch (err) {
    return json({ error: 'Could not reach email service' }, 502);
  }

  if (!sendResp.ok) {
    return json({ error: 'Could not send email' }, 502);
  }

  return json({ ok: true }, 200);
}
