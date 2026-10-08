const WORDS_PER_MINUTE = 200

function readTimeMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length

  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}

export { readTimeMinutes }
