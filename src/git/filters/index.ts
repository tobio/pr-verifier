import { AuthorFilter } from "./author";
import { LabelFilter } from "./label";
import { GHFilterTag } from "./types";
import { container } from "tsyringe";
import { ConfigItem } from "../../config";

container.register(GHFilterTag, {
  useClass: AuthorFilter
})

const environment = container.resolve(ConfigItem.Environment)
const labelPrefix = container.resolve(ConfigItem.LabelPrefix)
const excludedLabels = [
  `${labelPrefix}${environment}`,
  `>test`,
  `>infra`,
  `>docs`
]

excludedLabels.forEach(label => {
  container.register(GHFilterTag, {
    useValue: new LabelFilter(label, true)
  })
})

const includedLabels = container.resolve(ConfigItem.FilterLabels) as string[]

includedLabels.forEach(label => {
  container.register(GHFilterTag, {
    useValue: new LabelFilter(label)
  })
})

export { ConfiguredFiltersFilter } from "./configured";
