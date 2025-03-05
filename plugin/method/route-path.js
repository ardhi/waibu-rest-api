function routePath (name) {
  const { get } = this.app.bajo.lib._
  const { fullPath, ns } = this.app.bajo.breakNsPath(name)
  const prefix = get(this.app[ns], 'config.waibu.prefix', this.app[ns].alias)
  return `/${this.config.waibu.prefix}/${prefix}${fullPath}${this.config.format.asExt ? '.json' : ''}`
}

export default routePath
