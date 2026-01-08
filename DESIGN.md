# Minimal Library Portfolio — Design Document

## Goal
Deliver a one-page, ultra-minimal portfolio where shelves (categories) stack vertically, volumes (projects) scroll horizontally, and every element supports an engineering-library metaphor without decorative book visuals.

## Constraints Recap
- No skeuomorphism, navbars, gradients, heavy shadows, or book/page UI.
- Each project is a single compact card: Title, monospace stack, 1-line summary, metadata, optional hover-only link icons.
- Landing screen limited to title, subtitle, and “Scroll to browse volumes.”
- Motion stays subtle; clicking a card may open a minimal side drawer.
- Mobile: shelves stack vertically, cards become full-width rows.
- Typography-first approach: sans-serif body/titles, monospace metadata/stack.

## Milestones

### 1. Information Architecture + Content Model
- Define shelf taxonomy (e.g., Distributed Systems, Observability, Platform, Experiments).
- Draft project data schema (`title`, `stack`, `summary`, `metadata`, `links`, `details`).
- Verify volume counts per shelf to keep horizontal scroll manageable (3–4 per shelf).
- Decide copy tone (succinct, systems-focused).

### 2. Structural Wireframe & Interaction Plan
- Sketch layout: landing block, vertical shelf stack, horizontal rows, optional floating index.
- Specify drawer behavior (slide-in, modal semantics, close controls).
- Map keyboard focus order (cards focusable, drawer closable via Escape).
- Document responsive breakpoints (desktop horizontal scroll vs. mobile stacked cards).

### 3. Technology Stack & Setup
- Select implementation stack (pending confirmation: plain HTML/CSS/JS or framework).
- Initialize project structure (entry HTML, styles, scripts, assets).
- Configure tooling if needed (build scripts, linting, font loading strategy).

### 4. Data + Rendering Logic
- Encode shelf/project data in JSON or module.
- Build sections: landing hero, shelf generator, volume card template, optional index.
- Hook up drawer interaction populated from the same dataset.

### 5. Visual System Implementation
- Define global tokens (colors, spacing, typography scale, monospace stack).
- Style landing block: neutral background, typographic hierarchy.
- Style shelves/cards: strict grids, light borders, subtle hover/focus cues, hover-only link icons.
- Style floating index and drawer (minimal, functional).
- Ensure reduced-motion support, accessible contrast, focus outlines.

### 6. Responsive & Interaction Polish
- Add media queries for mobile (vertical stacking, index visibility rules).
- Validate scroll behavior (smooth, minimal snap, hidden scrollbars optional).
- Tune drawer transitions, backdrop, focus handling.
- Add ARIA labels/roles for shelves, cards, and drawer.

### 7. Content Validation & QA
- Populate real project data; confirm summaries stay within two lines.
- Cross-browser test (Chrome, Firefox, Safari, mobile).
- Accessibility checks (keyboard navigation, screen-reader labels, contrast).
- Performance sanity check (lightweight fonts, no heavy assets).

### 8. Handoff & Documentation
- Document data structure, how to add shelves/projects, and styling tokens.
- Provide run/build instructions.
- Capture reference screenshots or clips if needed.
