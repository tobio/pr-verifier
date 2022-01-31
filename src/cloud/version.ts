import {inject, injectable} from "tsyringe"
import { ConfigItem } from "../config"
import {CloudAuthentication} from "./authentication"
import {VersionParser} from "./parser"
import fetch from "node-fetch"

@injectable()
export class CloudVersion {
  constructor(
    @inject(ConfigItem.CloudEndpoint) private readonly endpoint: string,
    private readonly auth: CloudAuthentication,
    private readonly parser: VersionParser
  ) {}

  async getCurrentVersion(): Promise<string> {
    const auth = await this.auth.get()
    const response = await fetch(`https://${this.endpoint}/api/v1/regions/aws-eu-west-1/platform/infrastructure/container-sets/admin-consoles?include=containers`, {
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
