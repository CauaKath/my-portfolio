import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const services = { fetchMostRecentRepos: vi.fn(), fetchRepo: vi.fn() }
vi.mock('@/services/github', () => ({
  fetchMostRecentRepos: () => services.fetchMostRecentRepos(),
  fetchRepo: (org: string, repo: string) => services.fetchRepo(org, repo),
}))
vi.mock('../../services/github', () => ({
  fetchMostRecentRepos: () => services.fetchMostRecentRepos(),
  fetchRepo: (org: string, repo: string) => services.fetchRepo(org, repo),
}))

import Home from '../Home.vue'

const repo = (id: number) => ({
  id, name: `repo-${id}`, description: 'd', language: 'TypeScript', forks: 1, stargazers_count: 2, html_url: `https://x/${id}`,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Home', () => {
  it('shows repository skeletons from the first render until the repos load', () => {
    services.fetchMostRecentRepos.mockReturnValue(new Promise(() => {}))
    services.fetchRepo.mockReturnValue(new Promise(() => {}))
    const wrapper = mount(Home)

    expect(wrapper.findAll('.card-list .card')).toHaveLength(6)
    expect(wrapper.find('.card-list').attributes('aria-busy')).toBe('true')
    expect(wrapper.text()).toContain('Loading repositories')
  })

  it('replaces the skeletons with the repositories', async () => {
    services.fetchMostRecentRepos.mockResolvedValue([repo(1), repo(2)])
    services.fetchRepo.mockResolvedValue(repo(3))
    const wrapper = mount(Home)
    await flushPromises()

    expect(wrapper.find('.skeleton').exists()).toBe(false)
    expect(wrapper.findAll('.card-list .card')).toHaveLength(4)
    expect(wrapper.text()).not.toContain('Loading repositories')
  })
})
