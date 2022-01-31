export class VersionParser {
  parse(imageName: string): string {
    const tag = this.getImageTag(imageName)
    if(tag.includes('git')) {
      return this.parseGitSha(tag)
    }

    return tag
  }

  private getImageTag(imageName: string): string {
    const [image] = imageName.split('@')
    return image.split(':')[1]
  }

  private parseGitSha(tag: string): string {
    return tag.split('-')[2]
  }
}
