import { githubGet, respond, type Req, type Res } from './_github.js'

export default async function handler(_req: Req, res: Res) {
  if (!process.env.GITHUB_API_TOKEN) return respond(res, 500, { error: 'GITHUB_API_TOKEN not configured' })

  const upstream = await githubGet('/user/repos', {
    affiliation: 'owner',
    visibility: 'public',
    sort: 'updated',
    per_page: '10',
    page: '1',
  })

  if (!upstream.ok) return respond(res, 502, { error: `GitHub responded ${upstream.status}` })
  respond(res, 200, await upstream.json())
}
