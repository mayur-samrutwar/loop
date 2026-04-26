# Loop Design Guidelines

These guidelines define the visual and interaction standards for Loop. They should be reviewed once per year, but treated as the source of truth for day-to-day product work.

## Design Standard

Loop should feel modern, minimal, professional, and purpose-built for World Mini Apps. The product should look calm and intentional: generous spacing, clear hierarchy, soft surfaces, restrained color, and focused interactions.

Use Tailwind CSS only for styling. Prefer reusable components over one-off layouts.

## Core Principles

- One screen, one primary task. Each page should make the next user action obvious.
- Design mobile-first for the World App webview, then adapt only if needed.
- Keep content readable before making it decorative.
- Use whitespace as structure, not empty filler.
- Primary actions should remain easy to reach and visually dominant.
- Do not add visual complexity unless it improves trust, clarity, or completion.
- Protect user confidence with clear loading, empty, error, and success states.

## Spacing System

Use World Mini App spacing as the baseline:

- `24px` outer page padding by default (`p-6` in Tailwind).
- `16px` between a heading and directly associated content.
- `16px` between related items inside the same section.
- `24px` between a header and a subsection that starts with a sub-headline.
- `32px` between major sections.
- `32px` bottom padding after the last scrollable item when a bottom bar is present.
- `12px` between bottom navigation / sheets and iOS or Android bottom controls.
- Buttons above the active keyboard should sit `24px` above the keyboard.

If a custom spacing value is needed, choose from the 4px grid and document why.

## Page Layout

- Use `100dvh` / `h-dvh` for full-height screens.
- Avoid `100vh` for mini app pages because it can behave poorly on mobile webviews.
- Keep the main content area scrollable, not the whole app shell.
- Avoid iOS scroll bounce issues with `overscroll-behavior: none`.
- Preserve World App control areas near the top right; do not place critical controls where they may conflict.
- For bottom navigation, keep content clear of the safe area and preserve comfortable tap zones.

## Typography

- Use a clear hierarchy: small label, concise title, supportive body text.
- Titles should be short and action-oriented.
- Body copy should explain why the user is doing something, not repeat the UI label.
- Use muted text for context and stronger contrast for decisions, warnings, and results.
- Avoid dense paragraphs in the main flow; split long explanations into sections.

## Color And Surfaces

- Prefer neutral backgrounds with soft contrast.
- Use color sparingly for status, progress, and primary actions.
- Cards should feel light: subtle border, soft background, minimal shadow.
- Avoid saturated gradients except for small progress or emphasis moments.
- Do not use decorative color if the same meaning is not also communicated by text.

## Components

- Create reusable component files for repeated patterns.
- Keep components focused: one component should own one clear responsibility.
- Prefer World Mini Apps UI Kit components when they fit the interaction.
- Wrap UI Kit components with local components when Loop needs a consistent product-specific pattern.
- Avoid modifying working shared components unless the change improves the system broadly.

## States

Transient states should be centered in the usable content area:

- Loading states: centered, clear, and calm.
- Empty states: centered with a short headline, brief explanation, and one action.
- Error states: explain what failed and the next recovery action.
- Success states: confirm completion and offer the next useful step.

Toasts should be horizontally centered and positioned directly below the header.

## Forms And Keyboard

- Inputs should be large enough for comfortable touch interaction.
- Keep the active field visible when the keyboard opens.
- Primary form actions should sit `24px` above the keyboard.
- Use labels and helper text instead of placeholder-only instructions.
- Validate early when possible, but avoid noisy warnings before the user has acted.

## Sheets And Drawers

- Use sheets for focused secondary actions, confirmations, or short review flows.
- Keep sheets lifted `12px` above platform bottom controls.
- Keep sheet content concise and action-led.
- Do not use a sheet when a full page is needed for complex editing.

## Accessibility

- Maintain strong text contrast.
- Use semantic buttons, labels, and headings.
- Do not rely on color alone for state.
- Tap targets should be comfortable for thumbs.
- Motion should be subtle and never required to understand state.

## Annual Review Checklist

Review this file every year and confirm:

- World Mini App design guidance has not changed.
- Safe-area, keyboard, and webview behavior still match current iOS and Android behavior.
- Core spacing rules are still applied across new screens.
- Shared components still represent the current product quality bar.
- Any deviations from these rules are intentional and documented.

