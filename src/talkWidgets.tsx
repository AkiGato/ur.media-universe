/*
 * THE TALK'S INSTRUMENT BUNDLE.
 *
 * The talk deck (docs/talk.html) shows the project's own pages as rendered
 * images. Three of those pages are screenshots of instruments, and a picture of
 * an instrument cannot be operated — so this entry mounts the REAL components
 * from src/components/widgets and the deck frames them over the screenshot.
 * Nothing here reimplements anything: it is the same ContentBudgetWidget and
 * FiveQuestionsWidget the reader runs, with the same state and the same rules.
 *
 * WHY A SEPARATE ENTRY, AND WHY IIFE. The deck has to open by double-click,
 * from file://, with the network off — that is the claim its own last sheet
 * makes. A module script is blocked by CORS over file://, so this builds as a
 * classic script (see vite.talk.config.ts) with its CSS inlined.
 *
 * Which instrument to mount comes from the hash, so one bundle serves every
 * frame: talk-widgets.html#content-budget
 */
/* @types/react 19 dropped the global JSX namespace; it is exported from
   'react' now, and without this import `npm run lint` fails at the type check
   and none of the five audits behind it ever run. */
import type { JSX } from 'react';
import { createRoot } from 'react-dom/client';
import { ContentBudgetWidget } from './components/widgets/ContentBudgetWidget';
import { FiveQuestionsWidget } from './components/widgets/FiveQuestionsWidget';
import { AntiEngagementDiagram } from './components/diagrams/AntiEngagementDiagram';
import { CausalTaxonomyDiagram } from './components/diagrams/CausalTaxonomyDiagram';
import { FragilityIndexDiagram } from './components/diagrams/FragilityIndexDiagram';
import { TalkOrganism } from './talkOrganism';
import './index.css';

const INSTRUMENTS: Record<string, () => JSX.Element> = {
  /* sheet 13 — Content Pollution Control */
  'content-budget': () => <ContentBudgetWidget />,
  /* sheet 14 — The Golden Rule of Agency */
  'five-questions': () => <FiveQuestionsWidget />,
  /* sheet 1 — the organism, grown with the project's own dendrite generator
     and framed over the photographed dandelion on 'screen' */
  'organism': () => <TalkOrganism />,
  /* sheet 11 — the root system, with its own descent from surface to
     structure. Its third depth, "run it on your own source", calls the
     network and wants a key, so it is not for a room with the wifi off. */
  'causal-taxonomy': () => <CausalTaxonomyDiagram />,
  /* sheet 9 — the four fractures. The deck used to say them and show nothing;
     this is the project's own FIG 2.3, which draws them as one tenancy with
     four load paths rather than four peers in a row, and whose rest state is
     the sentence the speaker lands on. */
  'fragility-index': () => <FragilityIndexDiagram />,
  /* held in reserve: the anti-engagement figure, if a sheet ever wants it live */
  'anti-engagement': () => <AntiEngagementDiagram />,
};

function mount() {
  const host = document.getElementById('root');
  if (!host) return;
  const key = location.hash.replace(/^#/, '') || 'content-budget';
  const Instrument = INSTRUMENTS[key];

  if (!Instrument) {
    /* A frame pointing at a name that does not exist must say so on the
       surface, not in a console nobody has open during a talk. */
    host.textContent = `no instrument named "${key}"`;
    host.setAttribute(
      'style',
      'color:rgba(255,255,255,.4);font:300 13px system-ui;padding:2rem'
    );
    return;
  }
  createRoot(host).render(<Instrument />);
}

mount();
/* the deck re-points a frame by changing its hash rather than reloading it */
addEventListener('hashchange', () => location.reload());
