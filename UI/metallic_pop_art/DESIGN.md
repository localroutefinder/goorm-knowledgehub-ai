---
name: Metallic Pop Art
colors:
  surface: '#121416'
  surface-dim: '#121416'
  surface-bright: '#37393b'
  surface-container-lowest: '#0c0e10'
  surface-container-low: '#1a1c1e'
  surface-container: '#1e2022'
  surface-container-high: '#282a2c'
  surface-container-highest: '#333537'
  on-surface: '#e2e2e5'
  on-surface-variant: '#cac3d9'
  inverse-surface: '#e2e2e5'
  inverse-on-surface: '#2f3133'
  outline: '#938ea2'
  outline-variant: '#484456'
  surface-tint: '#cbbeff'
  primary: '#cbbeff'
  on-primary: '#340098'
  primary-container: '#6c38ff'
  on-primary-container: '#e9e0ff'
  inverse-primary: '#642cf7'
  secondary: '#d3fbff'
  on-secondary: '#00363a'
  secondary-container: '#00eefc'
  on-secondary-container: '#00686f'
  tertiary: '#ffb1c3'
  on-tertiary: '#66002c'
  tertiary-container: '#c9005f'
  on-tertiary-container: '#ffdce2'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e7deff'
  primary-fixed-dim: '#cbbeff'
  on-primary-fixed: '#1e0060'
  on-primary-fixed-variant: '#4c00d3'
  secondary-fixed: '#7df4ff'
  secondary-fixed-dim: '#00dbe9'
  on-secondary-fixed: '#002022'
  on-secondary-fixed-variant: '#004f54'
  tertiary-fixed: '#ffd9e0'
  tertiary-fixed-dim: '#ffb1c3'
  on-tertiary-fixed: '#3f0019'
  on-tertiary-fixed-variant: '#8f0041'
  background: '#121416'
  on-background: '#e2e2e5'
  surface-variant: '#333537'
  brushed-silver: '#E2E8F0'
  deep-gunmetal: '#101214'
  steel-blue: '#4A5568'
  halftone-dot: rgba(255, 255, 255, 0.05)
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1440px
  gutter: 24px
  margin-desktop: 40px
  margin-mobile: 16px
---

## Brand & Style

The design system embodies **Metallic Pop Art**—a fusion of high-precision aerospace engineering and the vibrant, high-contrast energy of mid-century modernism. It is designed for an AI platform that is both an industrial-grade powerhouse and an intuitive, energetic assistant. 

The aesthetic leverages **High-Contrast / Bold** layouts paired with **Tactile** surfaces. It targets high-stakes corporate environments (HR, Legal, R&D) where reliability is non-negotiable, but delivers that reliability through a cutting-edge, provocative interface that signals the "Intelligence" of the underlying RAG and Multi-LLM orchestration.

**Visual Principles:**
- **Mechanical Precision:** Elements are structured on a rigorous grid, suggesting the accuracy of the RAG engine.
- **Electric Energy:** High-saturation accents prevent the "metallic" base from feeling cold or stagnant.
- **Depth & Dimension:** Use of subtle brushed textures and halftone patterns to provide a tactile sense of "hardware."

## Colors

The palette is anchored in a **Dark Mode** environment that utilizes a "Metallic Base" with "Pop Accents."

- **The Metallic Base:** Uses `deep-gunmetal` for primary surfaces and `brushed-silver` for high-level interactive elements. A subtle linear gradient (45deg) from `steel-blue` to `deep-gunmetal` should be used for large container backgrounds to simulate a cold-rolled steel effect.
- **The Pop Accents:** `primary` (Electric Purple) is used for the main AI actions and "Auto" mode. `secondary` (Neon Cyan) represents data retrieval and RAG status. `tertiary` (Punchy Magenta) is reserved for urgent alerts or fallback notifications.
- **Semantic Usage:** 
    - **GPT:** #74AA9C (OpenAI Green) mixed with metallic sheen.
    - **Claude:** #D97757 (Anthropic Amber) mixed with metallic sheen.
    - **Gemini:** #4285F4 (Google Blue) mixed with metallic sheen.

## Typography

The typography strategy contrasts heavy, geometric display faces with highly technical, monospaced functional text.

- **Headlines:** Use **Montserrat** in Bold or ExtraBold weights. Headlines should often be styled with a "Silver-to-White" vertical gradient to mimic metallic embossed lettering.
- **Body:** **Inter** provides maximum legibility for long-form AI responses and document analysis. Maintain a generous line height (1.6) to offset the high-density information.
- **Labels & Data:** Use **JetBrains Mono** for technical metadata (e.g., "Top-K Search," "Vector ID," "Latency: 240ms"). This reinforces the "AI orchestration" aspect of the platform.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. The main application dashboard uses a three-pane fixed sidebar configuration for Workspaces and Documents, while the central "Chat" and "Response" area is fluid.

- **Grid:** A 12-column grid is used for the Dashboard view. Components should align strictly to the 8px base unit.
- **Rhythm:** Use "Power Spacing"—wide margins (40px+) on desktop to allow the "Metallic" backgrounds to breathe, contrasting with tight, dense spacing within technical cards and data tables.
- **Breakpoints:**
    - **Mobile (<768px):** Sidebar collapses into a bottom-sheet; 16px margins.
    - **Tablet (768px - 1024px):** Documents sidebar collapses into an icon-rail.
    - **Desktop (>1024px):** Full three-pane visibility.

## Elevation & Depth

This design system rejects soft, ambient shadows in favor of **Structural Depth** and **Metallic Edges**.

- **Metallic Surfaces:** Containers use a 1px solid border with a `linear-gradient(to bottom, #FFFFFF33, #00000033)` to create a "beveled" or "milled" edge effect.
- **Pop Art Shadows:** Instead of blurs, use "Hard Shadows" for primary interactive elements. A button might have a 4px offset shadow with 100% opacity in a contrasting color (e.g., a Purple button with a Black hard shadow).
- **Halftone Overlays:** Large background areas should have a subtle halftone dot pattern (`halftone-dot`) layered over the gunmetal base to add texture without reducing legibility.
- **Inner Glows:** Active states (like the selected LLM) use a 2px inner-shadow blur in `secondary` (Neon Cyan) to simulate an illuminated hardware button.

## Shapes

The shape language is **Industrial and Precise**. 

- **Corner Radius:** A consistent `0.25rem` (4px) is used for standard components to maintain a sharp, technical look. 
- **Buttons & Chips:** Use a slightly more aggressive `0.5rem` (8px) for primary actions to make them more approachable, but never use full pill-shapes, as they contradict the "machine-like" aesthetic.
- **Decorative Elements:** Use 45-degree "clipped corners" for status indicators or Workspace icons to evoke military-grade or high-tech hardware labeling.

## Components

- **Buttons:** 
    - **Primary:** Gradient fill (`primary` to `tertiary`), 1px white top-border (inner), and a heavy 4px black hard drop-shadow.
    - **Secondary:** Metallic silver base with `label-mono` text.
- **LLM Selector Chips:** 
    - When inactive: Deep gunmetal with a subtle brushed texture. 
    - When active: The border glows in the brand color of the LLM (e.g., Green for GPT), and the text switches to Montserrat Bold.
- **Chat Bubbles:**
    - **User:** Right-aligned, `steel-blue` background, sharp corners.
    - **AI:** Left-aligned, `deep-gunmetal` with a 1px `secondary` neon border. Halftone pattern applied to the background of the bubble.
- **Cards (Workspace/Document):** Use a "Glass-Metal" hybrid—semi-transparent gunmetal with a heavy backdrop-blur (20px) and a silver milled-edge border.
- **Input Fields:** Dark inset backgrounds with a `label-mono` prompt. The focus state should trigger an "Electronic Glow" effect using `secondary` (Neon Cyan).
- **Fallback Indicator:** A "Warning Strip" style component using diagonal `tertiary` and black stripes to indicate a model fallback is occurring.