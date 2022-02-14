import { injectable, injectAll } from "tsyringe";
import { PullRequest } from "../compare";
import { Filter, GHFilterTag } from "./types";

@injectable()
export class ConfiguredFiltersFilter {
  constructor(@injectAll(GHFilterTag) private readonly filters: Filter[])  {}

  private  _configuredFilters: Promise<Filter[]> | null = null
  private get configuredFilters(): Promise<Filter[]> {
    if(!this._configuredFilters) {
      const filtersWithConfiguredResult = Promise.all(this.filters.map(async filter => {
        const isConfigured = await filter.configured()

        return {
          filter,
          isConfigured
        }
      }))

      this._configuredFilters = filtersWithConfiguredResult.then(
        filters => filters
          .filter(({isConfigured}) => isConfigured)
          .map(({filter}) => filter)
      )
    }

    return this._configuredFilters
  }

  async configured() {
    return (await this.configuredFilters).length > 0
  }

  async filter(prs: PullRequest[]) {
    const isConfigured = await this.configured()
    if(!isConfigured) return prs

    const withMatchStatus = await Promise.all(
      prs.map(async (pr) => ({
        pr,
        matches: await this.matches(pr)
      }))
    )

    return withMatchStatus.filter(({matches}) => matches).map(({pr}) => pr)
  }

  async matches(pr: PullRequest) {
    const filters = await this.configuredFilters
    const withMatchStatus = await Promise.all(
      filters.map(f => f.matches(pr))
    )

    return withMatchStatus.every(r => r)
  }
}
