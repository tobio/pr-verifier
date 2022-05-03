import {inject, injectable} from "tsyringe"
import { Octokit } from "@octokit/core"
import { Endpoints } from "@octokit/types"

type Commits = Endpoints['GET /repos/{owner}/{repo}/compare/{basehead}']["response"]
type PR = Endpoints['GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls']["response"]["data"][number]
type PRAuthor = PR["user"]

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

const BACKPORT_PR_AUTHOR = "elasticcloudmachine"

@injectable()
class AuthorProviderFactory {
  private backportAuthorProvider = (pr: PR) => pr.head.user
  private defaultAuthorProvider = (pr: PR) => pr.user

  getAuthorProviderFor({user}: PR): (pr: PR) => PRAuthor {
    return user.login === BACKPORT_PR_AUTHOR ? this.backportAuthorProvider : this.defaultAuthorProvider
  }
}

@injectable()
class PullRequestParser {
  constructor(
    @inject(AuthorProviderFactory) private readonly authorProviderFactory: AuthorProviderFactory
  ) {}

  parse(pr: PR): PullRequest {
    const {html_url: url, number: id, labels} = pr
    const author = this.authorProviderFactory.getAuthorProviderFor(pr)(pr)

    return {
      url,
      id,
      labels: labels.map(({name}) => name),
      author: {
        url: author.url,
        name: author.login,
        id: author.id
      }
    }
  }
}

@injectable()
class GitCompare {
  constructor(
    @inject(Octokit) private readonly octokit: Octokit,
    @inject(PullRequestParser) private readonly prParser: PullRequestParser
  ) {}

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

    return prs.flatMap(pr => pr.data).map(pr => this.prParser.parse(pr))
  }
}

export { GitCompare }
