const desc = {
  create: 'Post a new record',
  find: 'Find records by query, page size and number.',
  get: 'Get record by ID',
  update: 'Update record by ID',
  remove: 'Remove record by ID'
}

function docDescription (method) {
  return this.print.write(desc[method])
}

export default docDescription
