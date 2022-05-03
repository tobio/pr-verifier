import "reflect-metadata";
import { CloudVersion } from "./cloud/version";
import { VersionHistory } from "./data/history";

import { container } from "tsyringe"
import { GitCompare } from "./git/compare";
import { ConfiguredFiltersFilter } from "./git/filters";
import { GitUpdater } from "./git/updater";
import { RateLimiter } from "./git/rate_limiter";

const cloudVersion = container.resolve(CloudVersion)
const history = container.resolve(VersionHistory)
const compare = container.resolve(GitCompare)
const filter = container.resolve(ConfiguredFiltersFilter)
const updater = container.resolve(GitUpdater)

const currentVersion = await cloudVersion.getCurrentVersion()
const lastKnownVersion = await history.getLastKnownVersion()

const allPrs = await compare.compare(lastKnownVersion, currentVersion)
const filteredPrs = await filter.filter(allPrs)
for (const pr of filteredPrs) {
    await updater.updatePullRequest(pr)
    console.log(`Updated PR`, pr.url, pr.author.name)
}

container.resolve(RateLimiter).close()

await history.storeVersion(currentVersion)
