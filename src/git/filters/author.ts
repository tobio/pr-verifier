import { inject, injectable } from "tsyringe";
import { ConfigItem } from "../../config";
import { PullRequest } from "../compare";

@injectable()
export class AuthorFilter {
  constructor(@inject(ConfigItem.FilterAuthor) private readonly author: string) {}

  configured(): boolean {
    return !!this.author
  }

  matches(pr: PullRequest) {
    return pr.author.name === this.author
  }
}
