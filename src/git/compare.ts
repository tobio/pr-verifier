import {inject, injectable} from "tsyringe"
import { Octokit } from "@octokit/core"
import { Endpoints } from "@octokit/types"

type Commits = Endpoints['GET /repos/{owner}/{repo}/compare/{basehead}']["response"]

export interface PullRequest {
  url: string
  id: number
  labels: string[]
  author: Author
}

export interface Author {
  url: string
  name: string
  id: number
}

@injectable()
export class GitCompare {
  constructor(@inject(Octokit) private readonly octokit: Octokit) {}

  async compare(base: string, target: string): Promise<PullRequest[]> {
    let parsedPrs = [];
    let page: number | null = 1;

    do {
      const commits = await this.octokit.request('GET /repos/{owner}/{repo}/compare/{basehead}', {
        owner: 'elastic',
        repo: 'cloud',
        basehead: `${base}...${target}`,
        per_page: 100,
        page,
      })

      const batchPrs = await this.fetchPRBatchFromCommits(commits)
      parsedPrs = [...parsedPrs, ...batchPrs]

      page = this.getNextPageFromLinks(commits.headers.link.split(','))
    } while (page)

    return parsedPrs
  }

  private getNextPageFromLinks(links: string[]): number | null {
    const nextLink = links.filter(link => link.includes('rel="next"'))[0]
    if(!nextLink) return null

    const nextUrl = nextLink.match(/<(?<url>[^>]*)>/).groups['url']
    const parsedUrl = new URL(nextUrl)
    return parseInt(parsedUrl.searchParams.get('page'), 10)
  }

  private async fetchPRBatchFromCommits(commits: Commits): Promise<Array<PullRequest>> {
    const prs = await Promise.all(
      commits.data.commits.map(
        commit => this.octokit.request('GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls', {
          owner: 'elastic',
          repo: 'cloud',
          commit_sha: commit.sha
        })
      )
    )

    const flatPrs = prs.flatMap(pr => pr.data).map(({html_url, number: id, labels, user}) => ({
      url: html_url,
      id,
      labels: labels.map(({name}) => name),
      author: {
        url: user.url,
        name: user.login,
        id: user.id
      }
    }))

    return flatPrs
  }
}
