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

// Whichever of the two text colors has the higher contrast ratio against the
// background, so a chip stays readable whatever color the author picks.
function readableTextColor(background: string): string {
  if (!isHexColor(background)) return DARK_TEXT

  const bg = luminance(background)
  const againstLight = 1.05 / (bg + 0.05)
  const againstDark = (bg + 0.05) / (luminance(DARK_TEXT) + 0.05)

  return againstLight > againstDark ? LIGHT_TEXT : DARK_TEXT
}

export { isHexColor, readableTextColor }
