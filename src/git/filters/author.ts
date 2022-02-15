import { inject, injectable, injectAll, registry } from "tsyringe";
import { ConfigItem } from "../../config";
import { PullRequest } from "../compare";
import { Octokit } from "@octokit/core";
import { Filter } from "./types";
import { ConfiguredFiltersFilter } from "./configured";

@injectable()
class LoginFilter {
  constructor(@inject(ConfigItem.FilterAuthors) private readonly logins: string[]) {}

  async configured() {
    return this.logins.length > 0
  }

  async matches(pr: PullRequest) {
    return this.logins.includes(pr.author.name)
  }
}

@injectable()
class TeamsFilter {
  constructor(
    @inject(ConfigItem.FilterTeams) private readonly teams: string[],
    @inject(Octokit) private readonly octokit: Octokit
  ) {}

  private  _logins: Promise<Set<string>> | null = null
  private get logins(): Promise<Set<string>> {
    if(!this._logins) {
      const teamRequests = Promise.all(
        this.teams.map((team) => this.octokit.request('GET /orgs/{org}/teams/{team_slug}/members', {
          org: 'elastic',
          team_slug: team,
          per_page: 100,
        }))
      )

      this._logins = teamRequests.then((teamAuthors) => {
        const authors = teamAuthors.flatMap(({data}) => data).map(({login}) => login)
        return new Set(authors)
      })
    }

    return this._logins
  }

  async configured() {
    return (await this.logins).size > 0
  }

  async matches(pr: PullRequest) {
    return (await this.logins).has(pr.author.name)
  }
}

const AuthorFilterTag = "AuthorFilter"

@injectable()
@registry([
  { token: AuthorFilterTag, useClass: LoginFilter },
  { token: AuthorFilterTag, useClass: TeamsFilter }
])
export class AuthorFilter extends ConfiguredFiltersFilter {
  constructor(@injectAll(AuthorFilterTag) filters: Filter[])  {
    super(filters)
  }
}
