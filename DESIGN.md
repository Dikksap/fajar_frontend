---
name: Luxe Inventory Management
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#3f4944'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#6f7973'
  outline-variant: '#bec9c2'
  surface-tint: '#1b6b51'
  primary: '#004532'
  on-primary: '#ffffff'
  primary-container: '#065f46'
  on-primary-container: '#8bd6b7'
  inverse-primary: '#8bd6b6'
  secondary: '#855300'
  on-secondary: '#ffffff'
  secondary-container: '#fea619'
  on-secondary-container: '#684000'
  tertiary: '#353c4c'
  on-tertiary: '#ffffff'
  tertiary-container: '#4c5364'
  on-tertiary-container: '#c0c7dc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a6f2d1'
  primary-fixed-dim: '#8bd6b6'
  on-primary-fixed: '#002116'
  on-primary-fixed-variant: '#00513b'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#dce2f7'
  tertiary-fixed-dim: '#c0c6db'
  on-tertiary-fixed: '#141b2b'
  on-tertiary-fixed-variant: '#404758'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.01em
  label-xs:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style
The design system is engineered for a high-end corporate inventory environment specifically tailored for premium electronics. The brand personality is authoritative, precise, and sophisticated, evoking a sense of trust and meticulous organization. 

The aesthetic follows a **Corporate Modern** style with **Minimalist** undertones. It prioritizes clarity and efficiency, utilizing generous whitespace to ensure that product imagery and data points remain the focal point. The visual language conveys reliability through structured alignment and a "High-End Retail" digital experience, bridging the gap between a functional warehouse tool and a luxury showroom.

## Colors
The palette is anchored by **Emerald Green**, used strategically for primary actions and brand presence to signify growth and stability. **Golden Yellow** serves as a high-visibility accent color, reserved for critical status indicators, primary "Buy/Sell" calls to action, or highlighting premium inventory tiers.

- **Primary (Emerald):** Used for navigation headers, primary buttons, and active states.
- **Secondary (Gold):** Used for accents, badges, and rating elements.
- **Neutral (Slate/Gray):** Used for secondary text, borders, and structured backgrounds.
- **Surface:** A crisp white (#FFFFFF) is used for cards and data tables to maximize legibility, while a very light gray (#F9FAFB) provides subtle contrast for the main background.

## Typography
This design system utilizes **Inter** across all levels to maintain a systematic, utilitarian, and clean appearance. The typographic hierarchy relies on weight and slight letter-spacing adjustments to differentiate between data labels and editorial content.

- **Headlines:** Use Semi-Bold (600) or Bold (700) with tighter tracking for a confident, architectural look.
- **Body:** Standard weight (400) with ample line height for comfortable reading of technical specifications.
- **Labels:** Medium weight (500) or Semi-Bold (600) for UI controls, table headers, and form labels.
- **Mobile scaling:** Large display headers scale down significantly on mobile to prevent awkward line breaks in narrow viewports.

## Layout & Spacing
The system uses a **Fixed Grid** model on desktop (12 columns, 1280px max-width) and a **Fluid Grid** on mobile. The spacing rhythm is based on a 4px baseline, ensuring all components align perfectly with the typographic grid.

- **Desktop:** 12 columns, 24px gutters, 40px minimum side margins.
- **Tablet:** 8 columns, 16px gutters, 24px side margins.
- **Mobile:** 4 columns, 16px gutters, 16px side margins.

Content is grouped into logical modules using the `xl` (40px) spacing for section separation and `md` (16px) for internal element grouping.

## Elevation & Depth
To maintain a high-end corporate feel, the design system utilizes **Tonal Layers** and **Ambient Shadows**. Depth is used sparingly to indicate interactivity and hierarchy.

- **Level 0 (Background):** Neutral Light Gray (#F9FAFB). No shadow.
- **Level 1 (Cards/Tables):** Pure White (#FFFFFF). A very soft, highly diffused shadow (0px 2px 4px rgba(0,0,0,0.05)) and a subtle 1px border (#E5E7EB) to define edges.
- **Level 2 (Hover/Active):** Slightly more pronounced shadow (0px 10px 15px rgba(0,0,0,0.08)) to indicate "lift" when a user interacts with an inventory card.
- **Level 3 (Modals/Overlays):** Strongest shadow (0px 20px 25px rgba(0,0,0,0.1)) with a backdrop blur on the underlying content to focus user attention.

## Shapes
The design system uses a **Soft** shape language. This level of roundedness (0.25rem to 0.75rem) strikes a balance between professional rigidity and modern friendliness.

- **Standard Elements:** 0.25rem (4px) for inputs, small buttons, and tags.
- **Large Elements:** 0.5rem (8px) for cards, modal containers, and hero images.
- **Status Pills:** Fully rounded (pill-shaped) to distinguish them from functional buttons.

## Components

### Buttons
- **Primary:** Solid Emerald Green with white text. High-contrast, sharp corners (4px).
- **Secondary:** Transparent with an Emerald Green border and text. Used for less critical actions.
- **Accent:** Solid Golden Yellow with dark gray text. Reserved for "Urgent" or "Limited" inventory alerts.

### Inventory Cards
- White background, 1px light gray border.
- Top-aligned product image with a subtle 5% gray fill background.
- Typography: Headline-MD for product name, Label-SM for SKU/Serial, and Emerald Green Body-MD for price.

### Data Tables
- Clean, border-less rows with 1px horizontal dividers.
- Header row: Light gray background, uppercase Label-XS text.
- Alternate row striping is avoided; instead, use hover-state highlights to assist line tracking.

### Inputs & Selects
- 1px border (#D1D5DB). On focus, the border transitions to Emerald Green with a 2px outer "glow" using a transparent version of the primary color.

### Status Chips
- Small, pill-shaped badges. Use a light background tint of the status color (e.g., light green background with dark green text for "In Stock").