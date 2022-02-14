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
  FilterAuthors = "FILTER_AUTHORS",
  FilterTeams = "FILTER_TEAMS",
  FilterLabels = "FILTER_LABELS"
}

interface ConfigItemOptions {
  supportsCSV?: boolean
  defaultValue?: string
}

const options: Map<ConfigItem, ConfigItemOptions> = new Map(
  [
    [ConfigItem.LabelPrefix, {defaultValue: "Team:Applications"}],
    [ConfigItem.FilterAuthors, {supportsCSV: true}],
    [ConfigItem.FilterTeams, {supportsCSV: true}],
    [ConfigItem.FilterLabels, {supportsCSV: true}],
  ]
)

const getConfigValue = (item: ConfigItem): string | string[] => {
  const {defaultValue, supportsCSV} = options.get(item) || {}
  const envItem = process.env[item]

  if(!envItem) return defaultValue || (supportsCSV ? [] : '')
  if(supportsCSV) return envItem.split(';')

  return envItem
}

for(const key of enumKeys(ConfigItem)) {
  const token = ConfigItem[key]
  container.register(token, {useValue: getConfigValue(token)})
}
