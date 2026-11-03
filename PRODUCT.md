# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary:** TypeScript-fluent indie founders and small engineering teams (1–6 people) starting a real product. They've shipped before, have opinions about their stack, and have personally lived through wiring NestJS + Prisma + Temporal + a typed frontend from scratch. They would rather fork an opinionated baseline than spend a week arguing Drizzle vs. Prisma. They are evaluating a year-long bet in under an hour.

**Secondary:** Engineers moving from "a single Express app" to "microservices + durable workflows" who want a reference project that is not a toy.

**The job:** "Decide in 20 minutes whether this saves me a month of setup, and if yes, fork it tonight and ship a demo by Friday."

## Product Purpose

ProjectX is an open-source (MIT, Proyecto 26) full-stack TypeScript template for building scalable, resilient applications with React and Temporal. It removes weeks of setup by shipping a wired, working baseline: NestJS microservices, durable Temporal workflows, Prisma/PostgreSQL, a React Router v7 SSR frontend, Stripe payments, and SendGrid/MJML email, all in one Turborepo.

Success: an evaluator understands the architecture and trusts it within one sitting, then forks it and ships something on top of it.

## Positioning

A template that doesn't stop at a toy. It runs a real end-to-end business flow (order → payment → fulfillment) on durable Temporal workflows across real microservices, and ships the tools that keep it extensible: service/workflow generators, an interactive CLI, a visual Temporal workflow playground, a component library with Storybook, and first-class AI-agent integration (Claude/Cursor/Codex skills, subagents, MCP servers). It makes the hard stack choices for you and owns them.

## Operating Context

- **Evaluation:** found on GitHub (README, star history), then the docs and landing surfaces. Read critically on desktop beside an IDE, occasionally triaged on a phone from Slack. Evaluators expect real code, real architecture, and no filler.
- **Development:** Storybook, the Temporal playground (`pnpm playground`, :4343), and the admin dashboard are used in long, often late-night, IDE-adjacent sessions.
- **Local stack:** `docker-compose` (PostgreSQL + PostGIS, Temporal server + UI, Elasticsearch), `pnpm dev`, Ngrok for webhooks, Stripe CLI for payment testing.
- **Spec-driven work:** OpenSpec changes and slash commands for non-trivial features.

## Capabilities and Constraints

- **Surfaces:** `apps/web` (React Router v7 SSR, Tailwind v4 + DaisyUI, TanStack Query), `packages/ui` + `apps/storybook`, the Temporal playground (`.agents/skills/temporal-playground/ui`, React Flow), MJML email templates, the README/docs. A marketing landing page and a hosted docs site are intended surfaces that do not exist yet.
- **The storefront in `apps/web` is a reference demo**, not a real store. Routes: home, marketplace, product detail, checkout, order summary/confirmation/history/detail, profile, login/logout, terms, privacy, email preview, admin orders. It must feel production-real yet stay generic and easy for forkers to rename, rebrand, and replace. The developers evaluating the template are its real audience, not shoppers.
- **Backend:** auth, order, and product NestJS services; Temporal order and payment workflows; Stripe checkout, webhooks, and refunds.
- **Terminology:** workflow, activity, signal, query, update, durable execution, and worker are Temporal terms of art and should be used precisely.
- **Undecided:** the landing page and docs-site hosting, scope, and stack; whether `apps/agents` and `apps/notification` (present locally but not tracked in git) become real services.

## Brand Commitments

- **Name:** ProjectX, by Proyecto 26. The logo exists as a README asset (GitHub user-attachments).
- **Personality:** *opinionated, workmanlike, generous.*
  - Opinionated: make the stack decisions and own them. Don't hedge with "or swap this for X."
  - Workmanlike: boring-in-the-best-sense tools, wired cleanly. Craft lives in the seams (generators, types, migrations), not in surface pyrotechnics.
  - Generous: ships far more than OSS usually does. It's a gift, not a funnel.
- **Voice:** unhurried, technical, welcoming. No consulting-brochure language ("empower," "next-generation," "seamlessly integrates"), no urgency tactics, no talking down to newcomers. Explain the why and show the escape hatch when one exists.
- **Funding:** free and open source, supported by GitHub Sponsors (https://github.com/sponsors/proyecto26) and the Proyecto 26 sponsorship program.

## Evidence on Hand

- The real codebase: services, workflows, generators, CLI, playground, and Storybook are all demonstrable with real code.
- `README.md` (feature list, "Why Temporal," setup, structure diagram, star-history chart); `docs/architecture`, `docs/backend` (DATABASE, RULES, TEMPORAL), `docs/frontend`, `docs/payment`; `docs/ProjectX-Design.pen` (design file).
- Curated external learning links: the Temporal TypeScript public courses listed in the README.
- **Absent, never fabricate:** testimonials, named adopters or customer logos, usage or download numbers beyond the live star-history chart, benchmarks, and pricing (there is none; it's MIT).

## Product Principles

1. **Code before copy.** Real code, types, and architecture are the proof. Prose frames code and never replaces it.
2. **Commit, explain, show.** Every stated opinion comes with a one-line why and a concrete code sample or diagram of how.
3. **Respect the reader's time and intelligence.** Say it once, say it well. Any sentence that could appear on any SaaS landing page gets deleted.
4. **Generic where forkers replace, opinionated where they inherit.** Demo content (the storefront, its catalog, its brand) stays easy to swap. Architecture, tooling, and conventions are the product and are stated with conviction.
5. **Durable, not trending.** The template will be forked for years. Choose what will still read as correct in three.

## Accessibility & Inclusion

- WCAG AA contrast in every theme.
- Respect `prefers-reduced-motion`, with a static fallback for every animation.
- Full keyboard navigation (power users keyboard through dev tools).
- Code samples at least 14px mono, high contrast, with generous line-height.
- Works at 200% zoom with no horizontal scroll.
