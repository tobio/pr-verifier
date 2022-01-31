import {inject, injectable} from "tsyringe"
import { ConfigItem } from "../config"
import { Octokit } from "@octokit/core"
import { PullRequest } from "./compare"


@injectable()
export class GitUpdater {
  constructor(
    @inject(Octokit) private readonly octokit: Octokit,
    @inject(ConfigItem.Environment) private readonly environment: string,
    @inject(ConfigItem.LabelPrefix) private readonly labelPrefix: string
  ) {}

  async updatePullRequest(pr: PullRequest): Promise<void> {
    await this.octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/labels', {
      owner: 'elastic',
      repo: 'cloud',
      issue_number: pr.id,
      labels: [`${this.labelPrefix}.in-env.${this.environment}`]
    })
    await this.octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner: 'elastic',
      repo: 'cloud',
      issue_number: pr.id,
      body: `This PR has been deployed to the ${this.environment} environment and is ready for verification. @${pr.author.name} please add the \`${this.labelPrefix}.verified-in.${this.environment}\` label after you've tested in ${this.environment}.`
    })
  }
}
