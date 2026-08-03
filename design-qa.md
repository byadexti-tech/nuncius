# Design QA — widget contextual nas abas de Snippets

## Evidence

- Source visual truth: `/Users/vitorprampolin/Desktop/Captura de Tela 2026-07-30 às 10.34.43.png`
- Browser-rendered implementation: `/Users/vitorprampolin/prampolin/nuncius/.codex-widget-overview.png`
- Browser-rendered real-widget implementation: `/Users/vitorprampolin/prampolin/nuncius/.codex-widget-real.png`
- Full-view comparison: `/Users/vitorprampolin/prampolin/nuncius/.codex-widget-comparison.png`
- Focused right-column comparison: `/Users/vitorprampolin/prampolin/nuncius/.codex-widget-comparison-focused.png`
- Viewport: 1710 × 889 CSS px
- Source: 3420 × 1778 px at 2×, normalized to 1710 × 889 px
- Implementation capture: 1710 × 889 px; browser device pixel ratio reported as 2 and the capture API normalized output to CSS pixels
- State: desktop, light admin theme, `Visão geral`, widget open, active snippet

## Findings

- No actionable P0, P1, or P2 mismatch remains.
- The tab row, page header, principal content column, sticky save bar, typography, borders, radii, and existing color tokens remain consistent with the source screen.
- The highlighted right column now contains an iframe executing the production `/widget.js`, instead of the former status/actions stack or a React simulation.
- The real widget mounts its production host and open Shadow DOM, with the real dialog, launcher, header, starter questions, composer, branding, configured colors, and production interactions.
- The former `Estado atual` and `Ações` controls were preserved below the main overview panel, avoiding a functionality regression while freeing the requested preview column.

## Required Fidelity Surfaces

- Fonts and typography: existing Inter/system hierarchy and weights were preserved; new preview copy follows the same small-label, heading, and body scale.
- Spacing and layout rhythm: the original two-column composition remains; the right track is 420 px and sticky, with the preview contained above the persistent save bar.
- Colors and visual tokens: existing slate, violet, emerald, and configured widget colors are reused. No new unrelated visual language was introduced.
- Image quality and asset fidelity: no raster assets were required. Existing Lucide icons and the configured launcher image path are reused.
- Copy and content: contextual labels describe the active tab and visitor state in Portuguese without changing existing tab or form copy.

## Interaction Verification

- All seven tabs remain present and update the URL.
- Verified `/widget.js`, `[data-nuncius-widget]`, the open Shadow DOM dialog, and the real widget controls inside the iframe.
- Verified the production widget closes and reopens from its own controls.
- Verified the overview state after returning from the other tabs.
- Browser console errors checked: none.
- Lint passed.
- Next.js production build passed.

## Comparison History

1. Initial comparison found a P2 fit issue: the 540 px preview viewport pushed the launcher behind the sticky save bar.
2. Fixed by reducing the preview viewport to 450 px and preserving position-aware top/bottom launcher placement.
3. Post-fix full and focused comparisons show the entire widget, including launcher, above the save bar with no clipped persistent controls.

## Follow-up Polish

- No remaining P3 item related to the widget runtime.

final result: passed
