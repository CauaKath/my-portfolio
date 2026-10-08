import axios from 'axios';

// Served by the Vercel functions in /api, which hold the GitHub token server-side.

import { type IRepo } from '../interfaces/github';

async function fetchMostRecentRepos() {
  try {
    const response = await axios.get<IRepo[]>('/api/repos');

    return response.data;
  } catch (error) {
    console.error('Error fetching most recent repos', error);
    return [];
  }
}

async function fetchRepo(org: string, repo: string) {
  try {
    const response = await axios.get<IRepo>('/api/repo', { params: { org, repo } });

    return response.data;
  } catch (error) {
    console.error('Error fetching org repos', error);
    return null;
  }
}

export { fetchMostRecentRepos, fetchRepo };