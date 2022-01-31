import {inject, injectable} from "tsyringe"
import { ConfigItem } from "../config"
import fetch from "node-fetch"

interface AuthenticationParams {
    type: 'Bearer' | 'ApiKey',
    token: string
}

@injectable()
export class CloudAuthentication {
  constructor(
    @inject(ConfigItem.CloudApiKey) private readonly apiKey: string,
    @inject(ConfigItem.CloudUsername) private readonly username: string,
    @inject(ConfigItem.CloudPassword) private readonly password: string,
    @inject(ConfigItem.CloudEndpoint) private readonly endpoint: string
  ) {}

  async get(): Promise<AuthenticationParams> {
    if(this.apiKey) {
      return {
        type: 'ApiKey',
        token: this.apiKey
      }
    }

    const response = await fetch(`https://${this.endpoint}/api/v0.1/login`, {
      method: 'POST',
      body: JSON.stringify({
        username: this.username,
        password: this.password
      }),
      headers: {'Content-Type': 'application/json'}
    })

    if(!response.ok) {
      const err = await response.text()
      throw new Error(`Failed to get Cloud authentication: ${err}`)
    }

    const body = await response.json() as {token: string}
    return {
      type: 'Bearer',
      token: body.token
    }
  }
}
