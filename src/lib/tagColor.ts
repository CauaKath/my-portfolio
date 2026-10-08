const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

const DARK_TEXT = '#0F172A'
const LIGHT_TEXT = '#FFFFFF'

function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value)
}

// WCAG relative luminance of an sRGB color.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255

    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Text is white unless the background is genuinely light. Deliberately not a
// strict contrast-ratio pick: that chose dark text for the mid-tone yellow,
// orange, gray and brown tags, and white looks better on all of them. Only
// very light colors (such as the light gray tag) get dark text.
const LIGHT_BACKGROUND = 0.5

function readableTextColor(background: string): string {
  if (!isHexColor(background)) return DARK_TEXT

  return luminance(background) > LIGHT_BACKGROUND ? DARK_TEXT : LIGHT_TEXT
}

export { isHexColor, readableTextColor }
