import { injectable, injectAll, registry } from "tsyringe";
import { PullRequest } from "../compare";
import { AuthorFilter } from "./author";
import "./label";

interface Filter {
  configured(): boolean
  matches(pr: PullRequest): boolean
}

const GHFilter = "GHFilter"

@injectable()
@registry([
  { token: GHFilter, useClass: AuthorFilter }
])
export class ConfiguredFiltersFilter {
  private readonly filters: Filter[]

  constructor(@injectAll(GHFilter) filters: Filter[])  {
    this.filters = filters.filter(f => f.configured())
  }

  configured() {
    return this.filters.length > 0
  }

  filter(prs: PullRequest[]) {
    return this.configured() ? prs.filter(pr => this.matches(pr)) : prs
  }

  matches(pr: PullRequest) {
    return this.filters.every(f => f.matches(pr))
  }
}
