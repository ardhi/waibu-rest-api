async function forFind (ctx, items) {
  return {
    data: {
      type: 'array',
      items
    },
    limit: { type: 'integer' },
    page: { type: 'integer' },
    pages: { type: 'integer' },
    count: { type: 'integer' },
    success: { type: 'boolean', default: true },
    statusCode: { type: 'integer', default: 200 }
  }
}

export default forFind
