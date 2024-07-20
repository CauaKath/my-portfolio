interface IRepo {
  id: number;
  name: string;
  description?: string;
  html_url: string;
  stargazers_count: number;
  forks: number;
  language: string;
}

export type { IRepo };