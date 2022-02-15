import { PullRequest } from "../compare";

export class LabelFilter {
  constructor(private readonly label: string, private readonly exclude: boolean = false) {}

  async configured() {
    return !!this.label
  }

  async matches(pr: PullRequest) {
    const isPresent = pr.labels.includes(this.label)

    if(this.exclude) return !isPresent

    return isPresent
  }
}
