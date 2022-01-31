import { inject, injectable, container } from "tsyringe";
import { ConfigItem } from "../../config";
import { PullRequest } from "../compare";

class LabelFilter {
  constructor(private readonly label: string, private readonly exclude: boolean = false) {}

  configured(): boolean {
    return !!this.label
  }

  matches(pr: PullRequest) {
    return pr.labels.includes(this.label) || this.exclude
  }
}

const environment = container.resolve(ConfigItem.Environment)
const labelPrefix = container.resolve(ConfigItem.LabelPrefix)
const excludedLabels = [
  `${labelPrefix}${environment}`,
  `>test`,
  `>infra`,
  `>docs`
]

excludedLabels.forEach(label => {
  container.register("GHFilter", {
    useValue: new LabelFilter(label, true)
  })
})

const includedLabel = container.resolve(ConfigItem.FilterLabel) as string

container.register("GHFilter", {
  useValue: new LabelFilter(includedLabel)
})
