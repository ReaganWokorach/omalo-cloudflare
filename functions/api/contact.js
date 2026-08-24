// Cloudflare Pages Function — POST /api/contact
//
// Handles submissions from the form on contact.html and emails an alert
// using Cloudflare's own Email Service (Compute > Email Service in the
// dashboard) via the `EMAIL` send_email binding declared in wrangler.toml.
// No third-party email service or API key is used — everything happens
// inside Cloudflare.
//
// One-time setup this depends on (all in the Cloudflare dashboard) is
// documented in SETUP.md:
//   1. Onboard your domain to Email Service (Email Sending).
//   2. Verify the inbox you want alerts sent to as a Destination Address.
//   3. Set the ALERT_TO_EMAIL and ALERT_FROM_EMAIL environment variables
//      on the Pages project.

export async function onRequestPost(context) {
  const { request, env } = context;

  const acceptsJson =
    (request.headers.get('Accept') || '').includes('application/json') ||
    (request.headers.get('Content-Type') || '').includes('application/json');

  const jsonResponse = (body, status) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });

  const fail = (message, status = 400) => {
    if (acceptsJson) return jsonResponse({ ok: false, error: message }, status);
    return Response.redirect(new URL('/contact.html?sent=error', request.url), 303);
  };

  const succeed = () => {
    if (acceptsJson) return jsonResponse({ ok: true }, 200);
    return Response.redirect(new URL('/contact.html?sent=success', request.url), 303);
  };

  // Parse either JSON (what the site's own JS sends) or a standard form
  // POST (a graceful fallback if a visitor has JavaScript disabled).
  let data;
  const contentType = request.headers.get('Content-Type') || '';
  try {
    if (contentType.includes('application/json')) {
      data = await request.json();
    } else {
      const form = await request.formData();
      data = Object.fromEntries(form.entries());
    }
  } catch (err) {
    return fail('Could not read the form submission.');
  }

  // Honeypot: real visitors never see or fill the "website" field. If it's
  // filled, silently pretend success so bots don't learn to adapt.
  if (data.website) {
    return succeed();
  }

  const name = (data.name || '').toString().trim().slice(0, 200);
  const reach = (data.email || '').toString().trim().slice(0, 200);
  const service = (data.service || '').toString().trim().slice(0, 200);
  const message = (data.message || '').toString().trim().slice(0, 4000);

  if (!name || !reach) {
    return fail('Please include your name and a way to reach you.');
  }

  const toAddress = env.ALERT_TO_EMAIL;
  const fromAddress = env.ALERT_FROM_EMAIL;

  if (!toAddress || !fromAddress || !env.EMAIL) {
    console.error('Contact form: ALERT_TO_EMAIL / ALERT_FROM_EMAIL / EMAIL binding not configured.');
    return fail(
      'The contact form is not fully set up yet. Please reach us by phone or WhatsApp in the meantime.',
      500
    );
  }

  const text = [
    'New enquiry from the Omalo Graphics Centre website.',
    '',
    'Name: ' + name,
    'Reach them at: ' + reach,
    'Service: ' + (service || 'Not specified'),
    '',
    'Message:',
    message || '(no message provided)'
  ].join('\n');

  const html =
    '<div style="font-family:sans-serif;font-size:15px;line-height:1.5;color:#171a15">' +
    '<h2 style="color:#084927;margin:0 0 12px">New enquiry from the website</h2>' +
    '<p><strong>Name:</strong> ' + escapeHtml(name) + '</p>' +
    '<p><strong>Reach them at:</strong> ' + escapeHtml(reach) + '</p>' +
    '<p><strong>Service:</strong> ' + escapeHtml(service || 'Not specified') + '</p>' +
    '<p><strong>Message:</strong><br>' + escapeHtml(message || '(no message provided)').replace(/\n/g, '<br>') + '</p>' +
    '</div>';

  try {
    const sendPayload = {
      to: toAddress,
      from: { email: fromAddress, name: 'Omalo Graphics Website' },
      subject: 'New contact form enquiry from ' + name,
      text,
      html
    };
    // Only set a reply-to when the visitor gave something that looks like
    // an email address (the field also accepts a phone number).
    if (reach.indexOf('@') !== -1) {
      sendPayload.replyTo = reach;
    }
    await env.EMAIL.send(sendPayload);
  } catch (err) {
    console.error('Contact form: email send failed:', err);
    return fail(
      'Something went wrong sending your message. Please try again, or reach us directly by phone.',
      502
    );
  }

  return succeed();
}

// Any method other than POST is not supported on this endpoint.
export async function onRequestGet() {
  return new Response('Method Not Allowed', { status: 405 });
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}
