import {inject, container, singleton, registry} from "tsyringe"
import { ConfigItem } from "../config"
import { Octokit } from "@octokit/core"

@singleton()
@registry([
  {
    token: Octokit,
    useFactory: (c) => {
      const octokit = new Octokit({auth: c.resolve(ConfigItem.GithubApiKey)})
      const rateLimiter = c.resolve(RateLimiter)
      return new Proxy(octokit, {
        get: (target, property, receiver) => {
          if(property === 'request') {
            return (...args) => rateLimiter.request().then(() => target.request.apply(target, args))
          }

          return Reflect.get(target, property, receiver)
        }
      })
    }
  }
])
export class RateLimiter {
  private remaining: number | null = null
  private reset: Promise<void>
  private resetTimeout: NodeJS.Timeout
  private readonly octokit: Octokit

  constructor(@inject(ConfigItem.GithubApiKey) apiKey: string) {
    this.octokit = new Octokit({auth: apiKey})
    this.initialise()
  }

  private async initialise(): Promise<void> {
    if(this.remaining !== null) return

    const rateLimit = await this.octokit.request('GET /rate_limit')
    this.remaining = rateLimit.data.rate.remaining
    this.reset = this.beginWaitForReset(rateLimit.data.rate.reset)
  }

  private async beginWaitForReset(reset: number): Promise<void> {
    const millisUntilReset = (reset * 1000) - Date.now()

    await new Promise(resolve => {
      this.resetTimeout = setTimeout(resolve, 60000 + millisUntilReset)
    })
    this.remaining = null
    await this.initialise()
  }

  async close() {
    clearTimeout(this.resetTimeout)
  }

  async request(): Promise<void> {
    if(this.remaining > 0) {
      this.remaining--
      return
    }

    await this.reset
    await this.request()
  }
}
