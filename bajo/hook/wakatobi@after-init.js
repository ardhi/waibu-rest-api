async function wakatobiAfterInit () {
  this.app.wakatobi.config.paramsCharMap[this.config.mapSlash] = '/'
  this.app.wakatobi.config.paramsCharMap[this.config.mapDot] = '.'
}

export default wakatobiAfterInit
