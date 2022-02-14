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
  private readonly logins: Promise<Set<string>>
  constructor(
    @inject(ConfigItem.FilterTeams) teams: string[],
    @inject(Octokit) octokit: Octokit
  ) {
    this.logins = this.fetchLogins(teams, octokit)
  }

  private async fetchLogins(teams: string[], octokit: Octokit): Promise<Set<string>> {
    const teamAuthors = await Promise.all(
      teams.map((team) => octokit.request('GET /orgs/{org}/teams/{team_slug}/members', {
        org: 'elastic',
        team_slug: team,
        per_page: 100,
      }))
    )

    const authors = teamAuthors.flatMap(({data}) => data).map(({login}) => login)
    return new Set(authors)
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
