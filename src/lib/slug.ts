const MAX_SLUG_LENGTH = 80

function slugify(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '')

  return slug || 'post'
}

function uniqueSlug(title: string, taken: string[]): string {
  const base = slugify(title)

  if (!taken.includes(base)) return base

  let suffix = 2
  while (taken.includes(`${base}-${suffix}`)) suffix += 1

  return `${base}-${suffix}`
}

export { slugify, uniqueSlug }
