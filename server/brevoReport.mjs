/**
 * The bug / proposition report, and the only thing in this project that talks
 * to a third party on the reader's behalf.
 *
 * WHY THIS FILE HAS NO FRAMEWORK IN IT. `handleReport` takes a parsed body and
 * returns a status and a payload. Nothing else. That is what lets the same code
 * run behind the Vite dev middleware today and behind a real Node host, a
 * serverless function or a worker tomorrow, without the logic being rewritten
 * to suit whichever one it is sitting in. The adapter is `reportPlugin.mjs`
 * and it is twenty lines.
 *
 * THE KEY NEVER REACHES THE CLIENT, AND THE NAMING IS WHAT GUARANTEES IT.
 * Vite exposes exactly the variables prefixed `VITE_` to bundled code and
 * nothing else. `BREVO_API_KEY` has no prefix, so it cannot be read from the
 * browser even by accident — not through `import.meta.env`, not by a stray
 * import. It is read here, in a process the reader never sees.
 *
 * WHAT IS SENT, AND WHAT IS NOT. The reader's own words, the subject they
 * chose, their address, and three technical fields the form shows them before
 * they press send. No identifier, no session, no reading position, no marks.
 * Nothing is sent unless somebody fills the form in and submits it — there is
 * no error hook and no background reporting wired to this, which is what keeps
 * the project's "no telemetry" promise true.
 */

const BREVO = 'https://api.brevo.com/v3';

/** The two things a report can be. Anything else is refused. */
export const SUBJECTS = {
  bug: 'Bug',
  proposition: 'Proposition'
};

/* Brevo will not send from an unverified address, so the sender is
   configurable and defaults to the address the reports go to — which is
   already verified by virtue of being the account's own. */
const senderEmail = () => process.env.BREVO_SENDER_EMAIL || 'aki.gato.tech@gmail.com';
const reportTo = () => process.env.REPORT_TO_EMAIL || 'aki.gato.tech@gmail.com';
const listId = () => Number(process.env.BREVO_LIST_ID || 5);

export const brevoConfigured = () => Boolean(process.env.BREVO_API_KEY);

/* Conservative, and deliberately not a full RFC 5322 implementation: this is a
   guard against obvious rubbish reaching the API, not an authority on what an
   address may be. Brevo does the real validation. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const MAX_MESSAGE = 4000;
const MAX_EMAIL = 254;

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Check the body before anything leaves the machine.
 *
 * Returns an error string, or null. Every message is one a person could act on
 * — "that address does not look right" rather than "validation failed".
 */
export function validate(body) {
  if (!body || typeof body !== 'object') return 'The report was empty.';
  const { email, subject, message } = body;

  if (typeof email !== 'string' || !EMAIL.test(email.trim())) {
    return 'That email address does not look right.';
  }
  if (email.trim().length > MAX_EMAIL) return 'That email address is too long.';

  if (typeof subject !== 'string' || !Object.hasOwn(SUBJECTS, subject)) {
    return 'Choose whether this is a bug or a proposition.';
  }

  if (typeof message !== 'string' || !message.trim()) {
    return 'The message is empty.';
  }
  if (message.trim().length > MAX_MESSAGE) {
    return `The message is longer than ${MAX_MESSAGE} characters.`;
  }
  return null;
}

/** One call to Brevo. Errors are returned, never thrown, so one failed step
    cannot take the whole report down with it. */
async function brevo(path, payload) {
  try {
    const res = await fetch(`${BREVO}${path}`, {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) return { ok: true };
    /* Brevo returns a JSON body with a code on failure; keep it for the server
       log and never hand it to the browser — it can name the account. */
    let detail = '';
    try { detail = JSON.stringify(await res.json()); } catch { detail = res.statusText; }
    return { ok: false, status: res.status, detail };
  } catch (err) {
    return { ok: false, status: 0, detail: String(err) };
  }
}

/**
 * Handle one report.
 *
 * THE ORDER IS THE PRIORITY ORDER, and it decides what "ok" means. Getting the
 * report to the maintainer is the only step that matters to the person who
 * wrote it: if the list subscription or the thank-you fails, they have still
 * been heard, and telling them otherwise would be a lie that costs them the
 * message they just typed. So the delivery is awaited first and its result is
 * the response; the other two are reported as warnings for the server log.
 */
export async function handleReport(body) {
  if (!brevoConfigured()) {
    return { status: 503, json: { ok: false, error: 'The report service is not configured.' } };
  }

  const problem = validate(body);
  if (problem) return { status: 400, json: { ok: false, error: problem } };

  const email = body.email.trim();
  const subject = body.subject;
  const message = body.message.trim();
  const context = {
    page: typeof body.page === 'string' ? body.page.slice(0, 200) : '',
    viewport: typeof body.viewport === 'string' ? body.viewport.slice(0, 40) : '',
    agent: typeof body.agent === 'string' ? body.agent.slice(0, 300) : ''
  };

  const label = SUBJECTS[subject];

  /* 1 — the report itself. This is the step the response reflects. */
  const delivery = await brevo('/smtp/email', {
    sender: { email: senderEmail(), name: 'Media as Universe' },
    to: [{ email: reportTo() }],
    replyTo: { email },
    subject: `[${label}] ${message.slice(0, 60).replace(/\s+/g, ' ')}`,
    htmlContent:
      `<p><strong>${escapeHtml(label)}</strong> from ${escapeHtml(email)}</p>` +
      `<p style="white-space:pre-wrap">${escapeHtml(message)}</p>` +
      `<hr><p style="font-size:12px;color:#666">` +
      `Page: ${escapeHtml(context.page) || '—'}<br>` +
      `Viewport: ${escapeHtml(context.viewport) || '—'}<br>` +
      `Browser: ${escapeHtml(context.agent) || '—'}</p>`
  });

  if (!delivery.ok) {
    console.error('[report] delivery failed', delivery.status, delivery.detail);
    return {
      status: 502,
      json: { ok: false, error: 'The report could not be sent. Nothing was lost — try again.' }
    };
  }

  const warnings = [];

  /* 2 — the contact, added or updated, and put on the list. `updateEnabled`
     makes this idempotent: a second report from the same address updates
     rather than failing as a duplicate. */
  const contact = await brevo('/contacts', {
    email,
    listIds: [listId()],
    updateEnabled: true,
    attributes: { LAST_REPORT_SUBJECT: label }
  });
  if (!contact.ok) {
    warnings.push('contact');
    console.error('[report] contact failed', contact.status, contact.detail);
  }

  /* 3 — the thank-you. Best effort by design: a reader whose report arrived
     has been heard whether or not the courtesy mail lands. */
  const thanks = await brevo('/smtp/email', {
    sender: { email: senderEmail(), name: 'Media as Universe' },
    to: [{ email }],
    subject: 'Your report has arrived',
    htmlContent:
      `<p>Thank you — your ${escapeHtml(label.toLowerCase())} has been received and will be read.</p>` +
      `<p style="white-space:pre-wrap;color:#555">${escapeHtml(message)}</p>` +
      `<p style="font-size:12px;color:#888">You are receiving this because you sent a report from Media as Universe.</p>`
  });
  if (!thanks.ok) {
    warnings.push('thank-you');
    console.error('[report] thank-you failed', thanks.status, thanks.detail);
  }

  return { status: 200, json: { ok: true, warnings } };
}
