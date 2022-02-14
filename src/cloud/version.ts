import {inject, injectable} from "tsyringe"
import { ConfigItem } from "../config"
import {CloudAuthentication} from "./authentication"
import {VersionParser} from "./parser"
import fetch from "node-fetch"

const regionsByEnv = new Map([
  ["qa", "environment"],
  ["staging", "us-east-1"],
  ["production", "us-east-1"]
])

@injectable()
export class CloudVersion {
  constructor(
    @inject(ConfigItem.CloudEndpoint) private readonly endpoint: string,
    @inject(ConfigItem.Environment) private readonly environment: string,
    private readonly auth: CloudAuthentication,
    private readonly parser: VersionParser
  ) {}

  get region(): string {
    return regionsByEnv[this.environment] || 'us-east-1'
  }

  async getCurrentVersion(): Promise<string> {
    const auth = await this.auth.get()
    const response = await fetch(`https://${this.endpoint}/api/v1/regions/${this.region}/platform/infrastructure/container-sets/admin-consoles?include=containers`, {
      headers: {
        Authorization: `${auth.type} ${auth.token}`
      }
    })

    const csets = await response.json() as any
    const adminConsole = csets.containers.filter(c => c.container_id === "admin-console")[0]

    if(!adminConsole && !adminConsole.instances[0]) {
      throw new Error("Couldn't find an admin-console container image")
    }

    const imageName = adminConsole.instances[0].image_name as string
    return this.parser.parse(imageName)
  }
}
