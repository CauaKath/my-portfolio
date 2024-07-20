import axios from 'axios';

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_API_TOKEN = import.meta.env.VITE_GITHUB_API_TOKEN;

import { type IRepo } from '../interfaces/github';

async function fetchMostRecentRepos() {
  try {
    const response = await axios.get<IRepo[]>(`${GITHUB_API_URL}/user/repos`, {
      headers: {
        Authorization: `Bearer ${GITHUB_API_TOKEN}`,
      },
      params: {
        affiliation: 'owner',
        sort: 'updated',
        per_page: 10,
        page: 1,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching most recent repos', error);
    return [];
  }
}

async function fetchRepo(org: string, repo: string) {
  try {
    const response = await axios.get<IRepo>(`${GITHUB_API_URL}/repos/${org}/${repo}`, {
      headers: {
        Authorization: `Bearer ${GITHUB_API_TOKEN}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching org repos', error);
    return null;
  }
}

export { fetchMostRecentRepos, fetchRepo };