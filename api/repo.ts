import { githubGet, respond, type Req, type Res } from './_github.js'

const NAME = /^[A-Za-z0-9._-]+$/

export default async function handler(req: Req, res: Res) {
  if (!process.env.GITHUB_API_TOKEN) return respond(res, 500, { error: 'GITHUB_API_TOKEN not configured' })

  const { org, repo } = req.query
  if (typeof org !== 'string' || typeof repo !== 'string' || !NAME.test(org) || !NAME.test(repo)) {
    return respond(res, 400, { error: 'Invalid org or repo' })
  }

  const upstream = await githubGet(`/repos/${org}/${repo}`)
  if (!upstream.ok) return respond(res, upstream.status === 404 ? 404 : 502, { error: `GitHub responded ${upstream.status}` })

  const data = await upstream.json()
  // The token can read private repos; this endpoint must only ever expose public ones.
  if (data.private) return respond(res, 404, { error: 'Not found' })
  respond(res, 200, data)
}
