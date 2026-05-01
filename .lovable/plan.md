

## Retro Comic Cartoon Theme

Transform the entire app into a retro comic book aesthetic with bold outlines, halftone patterns, speech-bubble elements, vibrant pop-art colors, and comic-style typography.

### Visual Design System Changes

**Colors** (in `src/index.css`):
- Primary: Bold blue (`220 90% 50%`) 
- Accent: Bright yellow (`50 100% 50%`) and hot red (`0 85% 55%`)
- Background: Off-white with subtle halftone dot pattern
- Cards: White with thick black borders
- Dark mode: Deep navy with neon accents

**Typography & Borders**:
- Import a comic font (e.g., `Bangers` from Google Fonts) for headings
- Keep a readable body font (e.g., `Comic Neue` from Google Fonts)
- Thick black borders (2-3px) on cards, buttons, inputs
- Drop shadows replaced with hard offset shadows (e.g., `4px 4px 0px black`)

**Components to restyle** (via Tailwind config + CSS):
- `Card`: thick black border, hard shadow offset, slightly rotated on hover
- `Button`: bold borders, hard shadows, uppercase comic text, pop effect on hover
- `Input`: thick borders, comic font placeholder
- Halftone dot background pattern via CSS (repeating radial gradient)

### Files to Modify

1. **`index.html`** — Add Google Fonts link for `Bangers` and `Comic Neue`
2. **`src/index.css`** — Update CSS variables for comic colors, add halftone background pattern, comic font families, hard shadow utilities
3. **`tailwind.config.ts`** — Add comic font families, extend shadow utilities with hard-offset shadows
4. **`src/components/ui/card.tsx`** — Add thick border + hard shadow default styles
5. **`src/components/ui/button.tsx`** — Comic-style variants with bold borders and pop animations
6. **`src/components/ui/input.tsx`** — Thick border styling
7. **`src/pages/Login.tsx`** — Add comic speech bubble styling to the login card, comic heading font
8. **`src/pages/Shortcut.tsx`** — Comic-style shortcut cards with pop hover effects, styled alert banner with comic speech bubble look

### Key CSS Additions

- Halftone dot pattern: `background-image: radial-gradient(circle, #000 1px, transparent 1px); background-size: 16px 16px;`
- Hard shadow: `box-shadow: 4px 4px 0px 0px #000;`
- Comic hover: scale + slight rotation + shadow shift
- Speech bubble tails via CSS `::after` pseudo-elements on select cards
- `POW!` / `BAM!` style animated burst on button clicks (optional flair)

