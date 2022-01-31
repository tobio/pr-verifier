import {container} from "tsyringe"

function enumKeys<O extends object, K extends keyof O = keyof O>(obj: O): K[] {
  return Object.keys(obj).filter(k => Number.isNaN(+k)) as K[];
}

export enum ConfigItem {
  Environment = "ENVIRONMENT",
  GithubApiKey = "GH_API_KEY",
  CloudUsername = "CLOUD_USERNAME",
  CloudPassword = "CLOUD_PASSWORD",
  CloudApiKey = "CLOUD_API_KEY",
  CloudEndpoint = "CLOUD_ENDPOINT",
  DataEndpoint = "DATA_ENDPOINT",
  DataUsername = "DATA_USERNAME",
  DataPassword = "DATA_PASSWORD",
  LabelPrefix = "LABEL_PREFIX",
  FilterAuthor = "FILTER_AUTHOR",
  FilterLabel = "FILTER_LABEL"
}

const defaults: Map<ConfigItem, string> = new Map(
  [[ConfigItem.LabelPrefix, "Team:Applications"]]
)

const getConfigValue = (item: ConfigItem): string => process.env[item] || defaults.get(item) || ''

for(const key of enumKeys(ConfigItem)) {
  const token = ConfigItem[key]
  container.register(token, {useValue: getConfigValue(token)})
}
