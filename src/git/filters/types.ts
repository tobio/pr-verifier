import { PullRequest } from "../compare";

export interface Filter {
    configured(): Promise<boolean>
    matches(pr: PullRequest): Promise<boolean>
}

export const GHFilterTag = "GHFilter"
