async function start () {
  const { uniq } = this.app.bajo.lib._
  this.config.format.supported.push('json')
  this.config.format.supported = uniq(this.config.format.supported)
}

export default start
