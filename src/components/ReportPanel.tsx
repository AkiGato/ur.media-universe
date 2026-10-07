import React, { useState } from 'react';
import { Soma } from './organic/Organic';
import { Check } from './organic/Icons';

/**
 * Report a bug, or propose something. Last entry in the settings drawer.
 *
 * THE FORM KNOWS NOTHING ABOUT BREVO, AND THAT IS THE POINT. It posts to
 * `/api/report` on its own origin; the key, the list id, the sender and the
 * three Brevo calls all live in `server/brevoReport.mjs`, in a process the
 * reader never sees. Nothing in this file could leak a credential because
 * nothing in this file has one.
 *
 * CLOSED UNTIL IT IS WANTED. The settings drawer is a list of preferences, and
 * a form standing open in the middle of one would be the loudest thing on a
 * surface where nothing should be loud.
 *
 * WHAT IT SAYS BEFORE IT SENDS. The disclosure names the destination and lists
 * the three technical fields above the button rather than under it — the same
 * thing the causal instrument does, and for the same reason: this project's
 * promise is that nothing leaves the machine, so the one place that is not
 * true has to say so before the reader acts, not after.
 *
 * LY-05 (no rounded corners), LY-06 (the fields are `.membrane-faint` wells,
 * not outlined boxes), TY-02 (9 and 12, no other size).
 */

type Subject = 'bug' | 'proposition';

const SUBJECTS: Array<{ id: Subject; label: string }> = [
  { id: 'bug', label: 'Bug' },
  { id: 'proposition', label: 'Proposition' }
];

export const ReportPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState<Subject>('bug');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const page = typeof document === 'undefined' ? '' : document.title;
  const viewport =
    typeof window === 'undefined' ? '' : `${window.innerWidth}x${window.innerHeight}`;

  const ready = Boolean(email.trim() && message.trim()) && !sending;

  const send = async () => {
    if (!ready) return;
    setSending(true);
    setError(null);
    try {
      // Under the mount point: on the portfolio this is
      // /projects/mediauniverse/api/report, which is where a handler for this
      // app would have to live. There is none on a static host — the POST
      // fails and the panel says so, which is also what happens today.
      const res = await fetch(`${import.meta.env.BASE_URL}api/report`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          subject,
          message: message.trim(),
          page,
          viewport,
          agent: typeof navigator === 'undefined' ? '' : navigator.userAgent
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setSent(true);
        setMessage('');
        /* The address stays. A reader who sends two reports should not have to
           type it twice, and it is theirs — nothing is stored here. */
      } else {
        setError(data.error || 'The report could not be sent.');
      }
    } catch {
      setError('The report could not be sent. Check the connection and try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`w-full flex items-center justify-between p-3 rounded-none outline-none ${
          open ? 'membrane-lit' : 'membrane-faint'
        }`}
      >
        <span className="flex items-center space-x-2.5 font-light text-[12px]">
          <Soma size={9} opacity={open ? 1 : 0.4} phase={9.4} />
          <span>Report a problem</span>
        </span>
        <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-45">
          {open ? 'Close' : 'Open'}
        </span>
      </button>

      {open && (
        <div className="space-y-2.5 settle">
          <label className="block">
            <span className="sr-only">Your email address</span>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setSent(false); }}
              placeholder="Your email"
              autoComplete="email"
              className="membrane-faint w-full p-3 text-[12px] font-light bg-transparent rounded-none outline-none"
            />
          </label>

          {/* Two buttons rather than a select: a native dropdown is the one
              control in a browser that cannot be styled to this drawing, and
              there are two options. `aria-pressed` carries the state that the
              light is showing. */}
          <div className="grid grid-cols-2 gap-3" role="group" aria-label="What kind of report">
            {SUBJECTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setSubject(s.id); setSent(false); }}
                aria-pressed={subject === s.id}
                className={`bud p-2.5 text-[9px] font-light uppercase tracking-[0.2em] rounded-none outline-none ${
                  subject === s.id ? 'bud-lit' : 'opacity-60'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="sr-only">What happened</span>
            <textarea
              value={message}
              onChange={(e) => { setMessage(e.target.value); setSent(false); }}
              rows={4}
              placeholder="What happened, and what were you doing"
              className="membrane-faint w-full p-3 text-[12px] font-light bg-transparent rounded-none outline-none resize-none"
            />
          </label>

          <p className="text-[9px] font-light leading-relaxed opacity-45">
            Sent by email, with the page you are on ({page || 'unknown'}), your window size
            ({viewport}) and your browser version. Your address joins the project mailing
            list. Nothing else is collected, and nothing is sent unless you press send.
          </p>

          <button
            type="button"
            onClick={send}
            disabled={!ready}
            className="bud w-full p-3 rounded-none outline-none text-[9px] font-light uppercase tracking-[0.2em]"
          >
            {sending ? 'Sending' : 'Send report'}
          </button>

          {sent && (
            <p className="flex items-center gap-2 text-[9px] font-light uppercase tracking-[0.2em] opacity-70">
              <Check className="w-3 h-3" />
              Report sent
            </p>
          )}
          {error && (
            <p className="text-[9px] font-light leading-relaxed opacity-70">{error}</p>
          )}
        </div>
      )}
    </div>
  );
};
