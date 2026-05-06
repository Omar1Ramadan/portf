import type { PageServerLoad } from './$types';
import { buildPortfolioContent, type GitHubRepoSummary } from '$lib/data/portfolio';

type GitHubRepoApiResponse = {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  homepage: string | null;
  updated_at: string;
  pushed_at: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  archived: boolean;
  fork: boolean;
  visibility?: string;
  private?: boolean;
};

const GITHUB_REPOS_ENDPOINT = 'https://api.github.com/users/Omar1Ramadan/repos?per_page=100&sort=updated';

function toRepoSummary(repo: GitHubRepoApiResponse): GitHubRepoSummary {
  return {
    name: repo.name,
    fullName: repo.full_name,
    htmlUrl: repo.html_url,
    description: repo.description,
    homepage: repo.homepage,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    language: repo.language,
    topics: repo.topics ?? [],
    stars: repo.stargazers_count,
    archived: repo.archived,
    fork: repo.fork,
    visibility: repo.visibility ?? (repo.private ? 'private' : 'public')
  };
}

export const load: PageServerLoad = async ({ fetch, setHeaders }) => {
  let repos: GitHubRepoSummary[] = [];

  try {
    const response = await fetch(GITHUB_REPOS_ENDPOINT, {
      headers: {
        Accept: 'application/vnd.github+json'
      }
    });

    if (response.ok) {
      const payload = (await response.json()) as GitHubRepoApiResponse[];
      repos = payload.map(toRepoSummary);
    }
  } catch {
    repos = [];
  }

  setHeaders({
    'cache-control': 'public, max-age=900'
  });

  return {
    portfolio: buildPortfolioContent(repos)
  };
};
