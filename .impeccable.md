# Impeccable — Design Context for ProjectX

This file is the North Star for every design decision in this repo: marketing site, docs, the web app in `apps/web`, the shared UI library in `packages/ui`, Storybook, and the interactive playground. Every `/impeccable` skill (craft, extract, polish, clarify, layout, typeset, critique, audit, etc.) reads this context before touching any surface. Update this file when the positioning shifts — do not override it per-feature.

## Design Context

### Users

**Primary**: TypeScript-fluent indie founders and small engineering teams (1–6 people) starting a real product. They've shipped before, have opinions about their stack, and have personally lived through wiring NestJS + Prisma + Temporal + a typed frontend from scratch. They'd rather fork an opinionated baseline than spend a week arguing Drizzle vs. Prisma. They are evaluating a year-long bet in under an hour.

**Secondary**: Engineers leveling up from "single Express app" to "microservices + durable workflows" who want a reference project that is not a toy.

**Context of use**:
- Landing page and docs: read critically while evaluating the template. Expects real code, real architecture diagrams, no marketing filler. Often on desktop at a real IDE. May be on a phone briefly while triaging from Slack.
- Storybook / playground / admin dashboard: used during actual development, long sessions, often at night, in IDE-adjacent windows. Dark environments matter.
- Scanned on GitHub before they even reach the site.

**The job they're trying to get done**: "Decide in 20 minutes whether this saves me a month of setup, and if yes, fork it tonight and ship a demo by Friday."

### Brand Personality

**Three words**: *opinionated, workmanlike, generous.*

- **Opinionated** — The template makes the hard tech-choice fights for you and owns them. Don't hedge. Don't list "or you can swap this for X." The point is to not have that conversation.
- **Workmanlike** — Picks tools that are boring in the best sense and wires them cleanly. No hype, no novelty-for-novelty's-sake. Craft shows up in the seams — generators, types, migrations — not in surface pyrotechnics.
- **Generous** — Ships more than OSS usually does: generators, playground, design system, Storybook, CI, e2e, Claude/Cursor integration, MCP servers. This is a gift, not a funnel.

### Interface Feel

*Unhurried, technical, welcoming.*

- **Unhurried** — The audience is making a long bet. A shouty site undermines that. No auto-scrolling carousels, no "limited time," no gradient-drenched hero fighting for attention. Confidence is quiet.
- **Technical** — Engineers would rather see a real code block, a real `docker-compose.yml`, a real workflow diagram, than a rotating feature grid. Let the code do the selling. Treat code samples as first-class typographic objects, not afterthoughts.
- **Welcoming** — "Opinionated" tips into "gatekeeping" fast, and OSS momentum dies when newcomers feel talked down to. Explain the why. Link to the course. Show the escape hatch when there is one.

### Aesthetic Direction

**Theme strategy** (derived from the reference set, not a default):
- **Marketing site / landing page**: dark-first default. Peers in this slot — Linear, Turborepo, Nx — are all dark-default, and the audience reads these sites on an IDE-adjacent second monitor. Provide an excellent light mode too, but hero in dark.
- **Docs**: light-first default. Peers here — Stripe Docs, Supabase Docs, Resend Docs — are light-default because long-form reading is measurably easier in light mode. Excellent dark mode alongside.
- **Web app chrome (`apps/web`)**: respect `prefers-color-scheme`. Neither mode is "first" here — they are equal citizens.
- **Storybook / playground / admin**: dark-first (long night sessions, dev-tool-adjacent).

**Visual references** (study these, do not copy):
- **Stripe Docs** — the gold standard for calm, confident, dense technical content. Study how sidebar, code samples, and prose share the same line of attention without any of them shouting.
- **Linear's marketing site** — confident, minimal, dark. Study the restraint: few colors, one accent, typography doing the work.
- **Resend** — engineer-direct, zero filler, treats code as the hero image.
- **shadcn/ui** — understated tokens, unopinionated chrome, maximum readability. Study the component-library restraint.
- **Turborepo and Nx landing pages** — direct peers in the monorepo-tooling space. Study positioning and how they demo a dev tool to devs.
- **Supabase docs** — study how dense technical content stays scannable.

**Anti-references** (explicitly forbidden):
- Generic Tailwind SaaS templates — the violet-to-blue hero gradient, twelve identical feature cards with icon-title-sentence, testimonial-with-avatar-row, CTA-banner-at-bottom pattern. Every element of this template is banned.
- Consulting-brochure language — "empower your digital transformation," "next-generation platform," "seamlessly integrates." Any sentence that could appear on an Accenture deck is deleted.
- Crypto/neon-on-black glitch aesthetics — wrong audience, borrowed edge.
- MUI's default demo look — fine on its own, but instantly recognizable and erases brand identity.
- AI-generated landing pages with "You.ai" energy — glowing orbs, sparkle emojis, rounded-corner-everything, gradient text, rainbow-card-grid. These read as disposable; a template meant to be forked for years must read as durable.
- The existing `Inter + DM Mono` stack in `packages/ui/styles/theme.css` is a *reflex* choice and both fonts are on the Impeccable reject list. Replace them with a deliberate pairing when we do typography work (see Typography Direction below).
- The existing `#6366F1` (indigo-500) primary is a reflex SaaS default and should be replaced with a considered palette when we do color work (see Color Direction below).

### Typography Direction

When typography work happens, the pairing MUST come from the "engineer-native, quietly crafted" bucket — these are the families our peers (Linear, Vercel, Resend, shadcn, Stripe's latest work) actually use. Do not silently fall back to Inter.

- **Strong contenders** for display + body:
  - Söhne (paid, Klim) — the peer-group default; if the project can afford a license, this is the closest single-pairing answer to "Stripe/Linear energy."
  - Geist Sans + Geist Mono (free, Vercel) — engineer-native, same aesthetic neighborhood, zero licensing friction for OSS.
  - Switzer or Satoshi (free, Indian Type Foundry via Fontshare) — quietly crafted, not in common monocultures yet.
  - GT America or GT Walsheim (paid, Grilli Type) — for a slightly warmer take.
- **Editorial accent** (headlines, section dividers) — optional: a quiet serif or display like Söhne Breit, Editorial New, or PP Editorial Old. Use sparingly, for pull quotes and section intros, never for UI chrome.
- **Mono** — JetBrains Mono or Geist Mono for code blocks. Never DM Mono. Code samples are the hero image on this site; the mono face matters more than the display face.

**Banned from use** (either per Impeccable reject list or per our anti-references): Inter, DM Sans, DM Mono, DM Serif, Fraunces, Newsreader, Lora, Crimson, Playfair Display, Cormorant, Syne, IBM Plex (any), Space Mono, Space Grotesk, Outfit, Plus Jakarta Sans, Instrument Sans, Instrument Serif.

### Color Direction

When color work happens:
- Replace the `#6366F1` indigo primary with a considered OKLCH palette. The brand hue should feel *engineered*, not *SaaS-templated*. Candidates worth exploring: a deep ink-teal, a warm graphite with a restrained accent, a near-black with a single saturated pull (Stripe's classic move), or a warm off-white + near-black with one warm accent (Linear's restrained move). Pick one and commit.
- Tint neutrals toward the chosen brand hue (even at chroma 0.005–0.01). The current `#F4F4F5` / `#FAFAFA` grays are hue-less.
- One accent, rare. No rainbow status palette for decorative use. Semantic status colors (success/warning/destructive) exist and should remain — just do not decorate with them.
- No gradient text. No cyan-on-dark or purple-to-blue gradients. If the site has a gradient at all, it is one soft, subtle wash — not a hero statement.

### Accessibility Baseline

- WCAG AA color contrast across both themes, non-negotiable.
- Respect `prefers-reduced-motion`: every animation needs a static fallback. This site's motion should be purposeful and rare anyway (see Motion Direction).
- Full keyboard navigation — this is a dev tool, power users will keyboard through it.
- Code samples: min 14px (ideally 15–16px) mono, high contrast, line-height generous. Engineers are reading these; they cannot be 12px afterthoughts.
- Scale up to 200% zoom without horizontal scroll on any page.

### Design Principles

Five principles derived from the above. Every design decision in this repo should be answerable against these — if it doesn't serve one, it probably doesn't belong.

1. **Code before copy.** The reader is here to see code, types, and architecture. Real code samples are hero imagery. Prose exists to frame code, not to replace it. If a section has more sentences than useful code, rewrite it.

2. **Calm density.** Dense is fine; loud is not. Stripe Docs and Supabase Docs carry enormous information density without ever shouting. Achieve the same with typographic hierarchy, generous line-height, and restrained color — not with cards, shadows, and gradients.

3. **Commit, explain, show.** Whenever an opinion is stated (e.g., "we chose Temporal"), immediately follow it with a one-line why and a concrete code/diagram of how. Opinionated without evidence reads as gatekeeping; opinionated with evidence reads as generous.

4. **Respect the reader's time and intelligence.** No consulting-brochure language. No "in today's fast-paced world." No repeating a heading in the paragraph below it. Say it once, say it well, move on. If a sentence could appear on any SaaS landing page, delete it.

5. **Durable, not trending.** This template will be forked in 2027 and 2028. Design choices that are fashionable today and dated in eighteen months (neon gradients, glassmorphism, bento grids as a reflex, AI-slop card aesthetics) are disqualified. When in doubt, pick the version that will look correct in three years.
