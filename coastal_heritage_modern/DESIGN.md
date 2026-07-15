---
name: Coastal Heritage Modern
colors:
  surface: '#fef8f3'
  surface-dim: '#ded9d4'
  surface-bright: '#fef8f3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f3ee'
  surface-container: '#f2ede8'
  surface-container-high: '#ece7e2'
  surface-container-highest: '#e6e2dd'
  on-surface: '#1d1b19'
  on-surface-variant: '#414844'
  inverse-surface: '#32302d'
  inverse-on-surface: '#f5f0eb'
  outline: '#717973'
  outline-variant: '#c1c8c2'
  surface-tint: '#3f6653'
  primary: '#012d1d'
  on-primary: '#ffffff'
  primary-container: '#1b4332'
  on-primary-container: '#86af99'
  inverse-primary: '#a5d0b9'
  secondary: '#7f5700'
  on-secondary: '#ffffff'
  secondary-container: '#ffb628'
  on-secondary-container: '#6d4a00'
  tertiary: '#471700'
  on-tertiary: '#ffffff'
  tertiary-container: '#6a2600'
  on-tertiary-container: '#ff8348'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c1ecd4'
  primary-fixed-dim: '#a5d0b9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#274e3d'
  secondary-fixed: '#ffdead'
  secondary-fixed-dim: '#ffba3b'
  on-secondary-fixed: '#281900'
  on-secondary-fixed-variant: '#604100'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7c2e00'
  background: '#fef8f3'
  on-background: '#1d1b19'
  surface-variant: '#e6e2dd'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  title-md:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  container-margin: 20px
  gutter: 16px
---

## Brand & Style
The design system is rooted in the concept of "Elevated Gastronomy," blending the warmth of traditional Barranquilla home cooking with the precision of a premium delivery service. The visual language is **Modern Corporate** with a **Tactile** edge—clean, organized layouts that prioritize high-resolution food photography to evoke an immediate sensory response.

The target audience ranges from busy professionals seeking a reliable lunch to families planning festive events. The UI must feel trustworthy, efficient, and above all, appetizing. By using a "Warm Minimalist" approach, we ensure that the interface never competes with the food, but rather serves as a clean, polished plate for the content.

## Colors
The palette is inspired by the lush landscapes and vibrant flavors of the Caribbean coast. 

- **Primary (Deep Green):** Represents freshness, quality ingredients, and stability. Used for primary actions, headers, and brand moments.
- **Secondary (Warm Yellow):** Evokes the sun and the golden hues of local fritos. This is our primary accent for "New" tags or highlighting special offers.
- **Tertiary (Orange):** A high-energy appetite stimulant used sparingly for "Order Now" buttons or cart notifications.
- **Background (Cream/Off-white):** A soft, warm canvas that reduces eye strain compared to pure white and adds a "homemade" feel.
- **Neutral (Slate/Grey):** Used for secondary text to maintain high legibility against the cream background.

## Typography
This design system utilizes a dual-font strategy to balance character with utility. 

**Montserrat** is used for headlines and titles to provide a confident, geometric, and modern personality. It captures the energy of a bustling event. 

**Inter** is the workhorse for all body text, menus, prices, and administrative dashboards. Its high x-height and systematic spacing ensure that ingredient lists and delivery times are legible even on small mobile screens under bright sunlight. 

All price points should use **Inter Bold** to ensure clear communication of value.

## Layout & Spacing
The layout follows an **8px grid system** to maintain mathematical harmony. 

**For Clients (Mobile-First):**
A fluid grid with 20px side margins. Cards usually span the full width or are arranged in a horizontal scroll for categories. The "Safe Area" at the bottom is reserved for a persistent "View Cart" floating action button.

**For Administration (Desktop Dashboard):**
A fixed sidebar (280px) with a fluid content area. We use a 12-column grid with 24px gutters to organize complex data tables, order queues, and inventory management modules. 

Spacing is intentionally generous (24px+) between distinct sections to prevent the "cluttered menu" feel and maintain a premium, clean aesthetic.

## Elevation & Depth
Depth is created through **Tonal Layering** and **Ambient Shadows**. 

The background layer is the warm cream (`#FCF7F2`). Secondary containers (like search bars or category filters) sit flush or slightly inset. 

**Interactive Cards:** Use a "Soft Lift" shadow—a very diffused, low-opacity shadow (Color: `#1B4332` at 8% opacity, Y: 4, Blur: 12) that makes the dish feel like it is sitting just above the surface. 

**Active States:** When a user selects an item, the shadow increases in blur and spread to simulate the element being "picked up." Avoid harsh borders; let the subtle color contrast between the white card and cream background define the edges.

## Shapes
The shape language is defined by **Rounded (0.5rem / 8px)** base units, scaling up to **2xl (1.5rem / 24px)** for major card components.

This high degree of roundedness communicates friendliness and mimics the organic shapes found in food.
- **Buttons:** Fully rounded (pill-shaped) for high-level CTAs; 12px roundedness for secondary buttons.
- **Cards:** Always use 24px (rounded-2xl) to create a soft, modern enclosure.
- **Inputs:** 8px (rounded-md) to maintain a sense of structure and precision.

## Components

### Buttons
- **Primary:** Deep Green background, white text. Pill-shaped. Used for "Place Order" or "Confirm."
- **Secondary:** Transparent with a 2px Deep Green border or subtle cream fill. Used for "Add more items."
- **Ghost:** Warm Yellow text, no background. Used for "View Details" or "Cancel."

### Dish Cards
- **Image:** Top-aligned, aspect ratio 4:3, with 24px top-corner rounding.
- **Content:** Title in Montserrat Semi-Bold, price in Inter Bold (Primary Green), and a short description in Inter Regular.
- **Interaction:** The entire card is clickable, with a "floating plus" icon in the bottom right corner (Warm Yellow) to quick-add to cart.

### Chips & Tags
- **Categories:** Light cream background with a thin green border. When active, background becomes Deep Green with white text.
- **Status Tags:** "In Prep" (Yellow), "Delivered" (Green), "Canceled" (Red). Use a light tinted background with high-contrast text of the same hue.

### Input Fields
- White background to contrast against the cream page. 
- 1.5px border in light grey, turning Deep Green on focus.
- Labels sit above the field in Inter Semi-Bold (14px).

### Selection Controls
- **Radio/Checkbox:** Use the Primary Green for the selected state. Ensure the hit area is at least 44x44px for mobile accessibility.