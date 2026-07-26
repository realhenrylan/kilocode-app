---
name: KiloCode Design System
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#d0c6ab'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#999077'
  outline-variant: '#4d4732'
  surface-tint: '#e9c400'
  primary: '#fff6df'
  on-primary: '#3a3000'
  primary-container: '#ffd700'
  on-primary-container: '#705e00'
  inverse-primary: '#705d00'
  secondary: '#44d8f1'
  on-secondary: '#00363e'
  secondary-container: '#00bcd4'
  on-secondary-container: '#004650'
  tertiary: '#deffd6'
  on-tertiary: '#00390a'
  tertiary-container: '#8bf088'
  on-tertiary-container: '#006e1c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe16d'
  primary-fixed-dim: '#e9c400'
  on-primary-fixed: '#221b00'
  on-primary-fixed-variant: '#544600'
  secondary-fixed: '#a1efff'
  secondary-fixed-dim: '#44d8f1'
  on-secondary-fixed: '#001f25'
  on-secondary-fixed-variant: '#004e59'
  tertiary-fixed: '#94f990'
  tertiary-fixed-dim: '#78dc77'
  on-tertiary-fixed: '#002204'
  on-tertiary-fixed-variant: '#005313'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '400'
    lineHeight: 14px
  code-block:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  container-padding: 24px
  gutter: 16px
---

## Brand & Style

The design system embodies a **Minimalist Corporate** aesthetic tailored specifically for high-performance developer tools. It prioritizes technical clarity and focus, drawing inspiration from modern IDEs and the structured utility of GitHub's interface. The brand personality is disciplined, professional, and precise, utilizing a "dark-first" philosophy that emphasizes content over chrome.

The visual language is defined by:
- **Precision Engineering:** Thin 1px borders and hairline dividers create a sense of structural integrity.
- **Intentional Whitespace:** Generous internal padding and wide margins prevent information density from becoming overwhelming.
- **Technical Contrast:** High-contrast text pairings and vibrant functional accents (Gold and Cyan) guide the eye through complex data.
- **Functional Depth:** Rather than heavy shadows, depth is achieved through layered tonal surfaces and subtle micro-elevations.

## Colors

The palette is anchored by **KiloCode Gold**, a high-energy primary accent used for critical actions and active states. This is balanced by a monochromatic foundation of obsidian and charcoal tones that minimize eye strain during long coding sessions.

- **Primary (Gold):** Used for primary buttons, active navigation indicators, and focus states. In light mode, it shifts to a deeper gold to maintain accessible contrast against white backgrounds.
- **Secondary (Cyan):** Reserved for technical feedback, terminal metrics, and interactive code tokens.
- **Functional Colors:** Emerald is used for success/connectivity, Crimson for errors/destruction, and Amber for warnings.
- **Neutral Tier:** A multi-layered dark grey scale provides hierarchy. `#0D0D0D` serves as the base, while `#1A1A1A` is used for elevated containers and input fields.

## Typography

This design system uses a dual-font strategy to separate UI controls from technical data.

- **UI Interface:** Uses **Inter** (sans-serif) for its neutrality and exceptional legibility at small sizes. It handles all navigation, settings labels, and primary body text.
- **Technical Content:** Uses **JetBrains Mono** for code snippets, terminal outputs, and metadata. The monospaced nature ensures that character alignment—critical for debugging—is preserved.

**Scale & Hierarchy:**
- Headlines are kept compact (max 18px) to fit the "pro-tool" density.
- Body text uses a slightly relaxed line height (1.6) in chat views to improve long-form readability.
- Labels and Metadata utilize the monospace font at 10px-12px to differentiate them from actionable UI text.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a strict 4px base unit. The shell is divided into three functional columns:
1. **Navigation Sidebar:** Fixed at 240px, collapsible.
2. **Main Content:** Fluid area for settings or chat streams.
3. **Utility Inspector:** Fixed at 384px, used for secondary technical details.

**Spacing Philosophy:**
- **Generous Settings Panels:** Use `xl` (24px) or `xxl` (32px) padding to create a calm, approachable configuration experience.
- **Dense Technical Lists:** Use `sm` (8px) or `md` (12px) vertical padding for sidebar items and session lists to maximize visible information.
- **Layout Adjustments:** On smaller window sizes, the sidebars collapse into drawers, and the main content padding reduces to 16px to maximize the workspace.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layering** and **Low-Contrast Outlines** rather than physical shadows.

- **Level 0 (Base):** Primary app background (`#0D0D0D`).
- **Level 1 (Surface):** Sidebars and secondary panels (`#141414`).
- **Level 2 (Elevated):** Modals, cards, and input fields (`#1A1A1A`).
- **Dividers:** Use 1px hairline borders (`#333333`) for structural separation. For extremely subtle grouping, use semi-transparent white dividers (`rgba(255,255,255,0.08)`).
- **Shadows:** When necessary for modals, use a heavy blur, low-opacity shadow (`0 8px 32px rgba(0,0,0,0.5)`) to lift the element without creating visual clutter.

## Shapes

The design system uses a **Rounded** shape language to soften the technical edge of the obsidian surfaces.

- **Standard Elements:** Buttons, checkboxes, and small cards use a 0.5rem (8px) radius.
- **Large Containers:** Modals and main composer inputs use a 0.75rem to 1rem radius to feel distinct from the sharp window edges.
- **Interactive States:** Hover states on list items use a 0.375rem (6px) radius for a "snug" feel within sidebars.

## Components

### Buttons
- **Primary:** Solid Gold background, Black text. 8px radius. Medium weight.
- **Secondary:** Ghost style with a 1px border (`#333333`). Transitions to a subtle grey background on hover.
- **Technical Action:** Dashed border for "Add" or "New" actions; turns Gold on hover.

### Form Fields
- **Inputs:** Dark background (`#1A1A1A`) with a subtle border. On focus, the border transitions to solid Gold.
- **Checkboxes/Radios:** Custom styled with Gold fills when active.

### Cards
- **Tool Cards:** Use a tertiary background (`#1A1A1A`) with a header bar. Code results inside cards are nested in a darker `#0D0D0D` block for contrast.

### Navigation
- **Sidebar Items:** Clear unselected state (Grey text). Active state uses a subtle Gold background tint (12% opacity) and a vertical Gold indicator bar on the left edge.

### Settings-specific Components
- **Section Headers:** 14px Semi-bold text with a thin divider line extending to the right margin.
- **Control Groups:** Group related toggles and inputs within a Level 2 container to separate them from the general page background.