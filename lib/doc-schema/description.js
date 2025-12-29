function docSchemaDescription (method) {
  const desc = {
    create: 'postRecordWithBody',
    find: 'findRecordsWithFilter',
    get: 'getRecordById',
    update: 'updateRecordByIdWithBody',
    remove: 'removeRecordById'
  }

  return this.t(desc[method])
}

export default docSchemaDescription
