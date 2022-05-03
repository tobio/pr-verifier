import {inject, injectable, singleton, registry} from "tsyringe"
import { ConfigItem } from "../config"
import { Octokit } from "@octokit/core"
import { RequestError } from "@octokit/request-error"

@registry([
  {
    token: Octokit,
    useFactory: (c) => {
      const octokit = new Octokit({auth: c.resolve(ConfigItem.GithubApiKey)})
      const rateLimiter = c.resolve(RateLimiter)
      const secondaryLimiter = c.resolve(SecondaryRateLimiter)

      return new Proxy(octokit, {
        get: (target, property, receiver) => {
          if(property === 'request') {
            return async (...args) => {
              await rateLimiter.request()
              return await secondaryLimiter.attemptRequest(target.request.bind(target, ...args))
            }
          }

          return Reflect.get(target, property, receiver)
        }
      })
    }
  }
])

@injectable()
class SecondaryRateLimiter {
  async attemptRequest(request: () => Promise<any>) {
    const attempts = 3
    for(let i = 0; i < attempts; i++) {
      try {
        return await request()
      } catch (err) {
        const shouldRetry = await this.handleRequestError(err)
        if(!shouldRetry) throw err
      }
    }
  }

  async handleRequestError(err): Promise<boolean> {
    if(!(err instanceof RequestError)) return false
    if(!err.response) return false
    if(!('retry-after' in err.response.headers)) return false

    const retryAfterSeconds = parseInt(err.response.headers['retry-after'].toString(), 10)

    console.log(`Secondary rate limit imposed, waiting ${retryAfterSeconds} seconds`)
    await new Promise(resolve => setTimeout(resolve, retryAfterSeconds * 1000))
    return true
  }
}

@singleton()
@injectable()
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

    console.log("Github rate limit exhausted. Waiting until limit reset")

    await this.reset
    await this.request()
  }
}
