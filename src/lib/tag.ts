interface TagColor {
  // Key into the tagColors messages; `name` stays as the English fallback.
  key: string
  name: string
  hex: string
}

// The only colors a tag can be given from the UI, in the order they are shown
// (two rows of seven). They are Tailwind's default palette, mostly the 600
// shade, which keeps white chip text readable; the comments name the source.
const TAG_COLORS: TagColor[] = [
  { key: 'lightGray', name: 'Light gray', hex: '#CBD5E1' }, // slate-300
  { key: 'gray', name: 'Gray', hex: '#475569' }, // slate-600
  { key: 'brown', name: 'Brown', hex: '#92400E' }, // amber-800
  { key: 'yellow', name: 'Yellow', hex: '#CA8A04' }, // yellow-600
  { key: 'orange', name: 'Orange', hex: '#EA580C' }, // orange-600
  { key: 'green', name: 'Green', hex: '#16A34A' }, // green-600
  { key: 'teal', name: 'Teal', hex: '#0D9488' }, // teal-600
  { key: 'blue', name: 'Blue', hex: '#2563EB' }, // blue-600
  { key: 'sky', name: 'Sky', hex: '#0284C7' }, // sky-600
  { key: 'indigo', name: 'Indigo', hex: '#4F46E5' }, // indigo-600
  { key: 'violet', name: 'Violet', hex: '#7C3AED' }, // violet-600
  { key: 'fuchsia', name: 'Fuchsia', hex: '#C026D3' }, // fuchsia-600
  { key: 'pink', name: 'Pink', hex: '#DB2777' }, // pink-600
  { key: 'red', name: 'Red', hex: '#DC2626' }, // red-600
]

const DEFAULT_TAG_COLOR = '#2563EB'

// Tag names are always lowercase with no spaces: whitespace becomes a hyphen
// so "data structure" stays readable as "data-structure". Safe to run on every
// keystroke; call trimHyphens once the user is done typing.
function normalizeTagName(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, '-').replace(/-{2,}/g, '-')
}

function finalTagName(raw: string): string {
  return normalizeTagName(raw).replace(/^-+|-+$/g, '')
}

export { TAG_COLORS, DEFAULT_TAG_COLOR, normalizeTagName, finalTagName }
export type { TagColor }
