import {inject, injectable} from "tsyringe"
import { ConfigItem } from "../config"
import fetch from "node-fetch"

@injectable()
export class VersionHistory {
  constructor(
    @inject(ConfigItem.Environment) private readonly environment: string,
    @inject(ConfigItem.DataEndpoint) private readonly endpoint: string,
    @inject(ConfigItem.DataUsername) private readonly username: string,
    @inject(ConfigItem.DataPassword) private readonly password: string
  ) {}

  base64Credentials(): string {
    return Buffer.from(`${this.username}:${this.password}`).toString('base64')
  }

  defaultHeaders(): Record<string, string> {
    return {
      Authorization: `Basic ${this.base64Credentials()}`,
      "Content-Type": "application/json"
    }
  }

  async storeVersion(version: string): Promise<void> {
    const response = await fetch(`${this.endpoint}/pr-verifier/_doc`, {
      method: 'POST',
      body: JSON.stringify({
        '@timestamp': new Date().toISOString(),
        environment: this.environment,
        version
      }),
      headers: this.defaultHeaders()
    })

    if(!response.ok) {
      const body = await response.text()
      throw new Error(`Failed to store version: ${body}`)
    }
  }

  async getLastKnownVersion(): Promise<string | undefined> {
    const response = await fetch(`${this.endpoint}/pr-verifier/_search`, {
      method: 'POST',
      body: JSON.stringify({
        query: {
          match: {
            "environment.keyword": this.environment
          }
        },
        sort: [
          { "@timestamp": "desc" }
        ],
        size: 1
      }),
      headers: this.defaultHeaders()
    })

    const results = await response.json() as any
    const hit = results.hits.hits[0]

    return hit?._source.version
  }
}
