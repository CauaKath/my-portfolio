const GITHUB_API_URL = 'https://api.github.com'

// Minimal request/response shapes so the functions need no @vercel/node dependency.
interface Req { query: Record<string, string | string[] | undefined> }
interface Res {
  status(code: number): Res
  setHeader(name: string, value: string): Res
  json(body: unknown): void
}

async function githubGet(path: string, params?: Record<string, string>) {
  const url = new URL(`${GITHUB_API_URL}${path}`)
  for (const [key, value] of Object.entries(params ?? {})) url.searchParams.set(key, value)

  return fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${process.env.GITHUB_API_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
}

function respond(res: Res, status: number, body: unknown) {
  // The token never leaves the server; the repo data itself is public, so cache at the edge.
  if (status === 200) res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  res.status(status).json(body)
}

export { githubGet, respond }
export type { Req, Res }
