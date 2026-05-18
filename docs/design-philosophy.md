# Design Philosophy

Omni-Agent Hivemind should feel calm, obvious, and usable before it feels powerful.

Assume the user is a layman. They may be smart, capable, and ambitious, but they
should not need to understand agent runtime internals, crypto payment protocols,
Tailnet topology, API routes, environment variables, or model orchestration just
to use the product safely.

The app is a control room for complex agent systems, but the interface should not
make users carry that complexity in their head. The default surface must show only
the essential thing a user needs to understand or do next. Everything advanced
should still be available, but it should live one clear tap, press, or disclosure
away.

## Core Principle

Simple first. Depth on demand.

Every screen should answer three questions quickly:

- What is happening?
- What needs attention?
- What is the next safe action?

If a control, number, explanation, or configuration field does not help answer one
of those questions for an average user, it should not be part of the primary view.

## Product Rules

- Show the smallest useful surface by default.
- Prefer plain labels over technical protocol names in primary UI.
- Prefer status summaries over raw configuration values.
- Prefer one obvious action over a row of equally loud actions.
- Hide advanced settings behind `Advanced`, `Details`, `Configure`, or a similar
  disclosure.
- Keep dangerous or money-moving controls separate from read-only status.
- Make setup progressive: first connect, then verify, then configure limits, then
  expose advanced rails.
- Keep dense debug, logs, raw JSON, endpoint paths, keys, model settings, payment
  protocol details, and runtime internals out of the default path.
- Give each card one main job. Avoid turning cards into miniature dashboards.
- If a user sees a page for the first time, they should be able to act without
  reading documentation.
- Write and design for a non-technical person first; experts can open advanced
  sections when they need exact controls.

## Progressive Disclosure

Complex features are welcome, but they must be partitioned.

Use this hierarchy:

1. **Primary surface**: health, human-readable status, and the safest next action.
2. **Secondary surface**: common setup and adjustment controls.
3. **Advanced surface**: raw provider settings, protocol details, endpoints,
   environment variable names, debug output, and irreversible actions.

For example, an agent wallet card should first show:

- wallet on/off
- balance or funding status
- survival state
- one button to set up or manage

Provider keys, x402 networks, burn-rate math, approval thresholds, and payment
policy internals belong inside a setup flow or advanced section.

## Navigation

Top-level tabs should be understandable at a glance. They are for broad work
modes, not for every feature.

Within a work mode:

- Put the most common action close to the object it affects.
- Let users jump from summary cards into the relevant management surface.
- Keep overview pages scannable.
- Avoid making users remember where a feature lives.

## Copy

Use direct, human copy.

Good:

- `Set up wallet`
- `Needs funding`
- `3 days left`
- `Requires approval`

Avoid primary UI copy like:

- `Configure x402 CAIP-2 network selector`
- `Survival ledger effective balance derivation`
- `Payment requirement policy resolver`

Technical language is fine in advanced views, docs, tooltips, and logs.

When technical language is unavoidable, pair it with a plain-English meaning.
For example, show `Base wallet` only if nearby copy explains it as where the
agent receives and spends funds.

## Visual Density

Dense operational tools are allowed, but density must be organized.

- Use compact status rows for overview.
- Use cards only for repeated objects or contained tools.
- Avoid nested card piles.
- Keep forms short by default.
- Split long forms into sections.
- Collapse optional sections.
- Make the empty state useful but brief.

## Wallet And Payments

Money features must be especially simple and calm.

Default wallet UI should focus on:

- whether the agent can spend
- how much it can safely spend
- whether it will stop soon
- what the user should do next

Advanced payment rails, provider-specific setup, payment protocol internals,
card/account details, and raw policy controls should be hidden until requested.

Never expose private keys, full card details, secret tokens, billing identity, or
high-risk payment execution controls in broad overview UI.

## Acceptance Check

Before shipping a UI change, ask:

- Can a first-time user understand the screen in ten seconds?
- Is the safest next action visually obvious?
- Did we hide non-essential complexity behind a clear control?
- Are advanced controls available without dominating the page?
- Did we avoid turning a simple task into a configuration exercise?

If the answer is no, simplify the primary surface before adding more capability.
