// Returns inline SVG markup for a single honeycomb hex tile.
// The main hex fill follows CSS `color` via `currentColor` so callers can tint via style.color.
export function honeyHexSvg(): string {
  return `
<svg class="hx-svgel" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 486.92 425.9" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false" style="pointer-events:none;display:block">
  <defs>
    <style>
      .cls-1 { fill: var(--hx-edge, color-mix(in srgb, currentColor 20%, black)); }
      .cls-2 { fill: var(--hx-hi,   color-mix(in srgb, currentColor 12%, white)); }
      .cls-3, .cls-4 { stroke: var(--hx-stroke, rgba(0,0,0,.5)); stroke-miterlimit: 10; }
      .cls-3 { fill: currentColor; }
      .cls-4 { fill: var(--hx-side, color-mix(in srgb, currentColor 35%, black)); }
    </style>
  </defs>
  <polygon class="cls-3" points="359.97 .5 120.38 .5 .58 206.87 120.38 413.23 359.97 413.23 479.77 206.87 359.97 .5"/>
  <polygon class="cls-4" points="360.16 413.21 368.56 424.52 486.34 217.84 479.77 206.87 360.16 413.21"/>
  <polygon class="cls-4" points="368.56 424.52 360.43 413.23 120.96 414.18 127.76 425.4 368.56 424.52"/>
  <polygon class="cls-2" points="126.12 .5 120.38 .5 .62 206.09 3.38 210.67 126.12 .5"/>
  <polygon class="cls-2" points="361.46 4.06 359.21 .19 121.14 .49 124.09 3.73 361.46 4.06"/>
  <polygon class="cls-1" points="120.66 412.73 123.31 412.73 2.37 203.08 .62 206.07 120.66 412.73"/>
</svg>`
}

// Empty tile variant (lighter; no dark base polygons). Fill follows currentColor.
export function honeyHexEmptySvg(): string {
  return `
<svg class=\"hx-svgel\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 479.31 412.83\" width=\"100%\" height=\"100%\" preserveAspectRatio=\"none\" aria-hidden=\"true\" focusable=\"false\" style=\"pointer-events:none;display:block\">
  <defs>
    <style>
      .cls-1 { fill: currentColor; stroke: var(--hx-stroke, rgba(0,0,0,.5)); stroke-miterlimit: 10; stroke-width: .1px; }
    </style>
  </defs>
  <polygon class=\"cls-1\" points=\"359.45 1.05 119.86 .05 .06 206.42 119.86 412.78 359.45 412.78 479.25 207.42 359.45 1.05\"/>
</svg>`
}

// Filled (occupied) tile variant provided by user; colors are themeable via CSS variables
export function honeyHexFilledSvg(): string {
  return `
<svg class="hx-svgel" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 489.57 429.49" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false" style="pointer-events:none;display:block">
  <defs>
    <style>
      .cls-1 { fill: var(--hx-edge, color-mix(in srgb, currentColor 20%, black)); }
      .cls-2 { fill: var(--hx-hi,   color-mix(in srgb, currentColor 12%, white)); }
      .cls-3, .cls-4 { stroke: var(--hx-stroke, rgba(0,0,0,.6)); stroke-miterlimit: 10; }
      .cls-3 { fill: currentColor; }
      .cls-4 { fill: var(--hx-side, color-mix(in srgb, currentColor 35%, black)); }
    </style>
  </defs>
  <polygon class="cls-3" points="359.97 .5 120.38 .5 .58 206.87 120.38 413.23 359.97 413.23 479.77 206.87 359.97 .5"/>
  <polygon class="cls-4" points="361.3 411.82 371.89 427.32 488.99 222.12 479.6 206.57 361.3 411.82"/>
  <polygon class="cls-4" points="371.02 427.72 360.43 412.23 120.38 413.23 129.6 428.98 371.02 427.72"/>
  <polygon class="cls-2" points="126.65 1.27 120.67 1.01 1.15 206.86 3.92 211.45 126.65 1.27"/>
  <polygon class="cls-2" points="361.92 4.87 359.68 .99 120.67 1.01 124.09 4.73 361.92 4.87"/>
  <polygon class="cls-1" points="120.68 412.76 123.3 412.71 2.84 203.9 1.09 206.9 120.68 412.76"/>
</svg>`
}
