/* =========================================================
   POST /api/contact
   Cloudflare Pages Function backing the contact form on
   contact.html. Validates the submission, then sends a
   notification email through the Resend API.

   Spam defense is the honeypot field only (see the "website"
   check below, mirrored client-side in js/script.js). There
   is no CAPTCHA/bot-verification step on this endpoint.

   Required environment (see SETUP.md):
     - env.RESEND_API_KEY     (secret — API key from resend.com)
     - env.CONTACT_EMAIL_TO   (destination inbox)
     - env.CONTACT_EMAIL_FROM (must be on a domain verified in Resend)
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
  const apiKey = env.RESEND_API_KEY;

  if (!to || !from || !apiKey) {
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

  // The form's "email" field also accepts a phone number, but Resend
  // rejects reply_to values that aren't a valid email address — only
  // set it when the value actually looks like one.
  var looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  var payload = {
    to: [to],
    from: from,
    subject: 'New enquiry from ' + name,
    text: textBody,
    html: htmlBody
  };
  if (looksLikeEmail) {
    payload.reply_to = email;
  }

  let sendResp;
  try {
    sendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    return json({ error: 'Could not reach email service' }, 502);
  }

  if (!sendResp.ok) {
    return json({ error: 'Could not send email' }, 502);
  }

  return json({ ok: true }, 200);
}
