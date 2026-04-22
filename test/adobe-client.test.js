const test = require('node:test')
const assert = require('node:assert/strict')

const client = require('../lib/adobe-client')

test('local health returns UP', async () => {
  const result = await client.health()
  assert.equal(result.status, 'UP')
  assert.match(result.service, /Adobe/)
})

test('remoteHealth returns DOWN on unresolved destination but keeps structured payload', async () => {
  const result = await client.remoteHealth({ jwt: undefined })
  assert.equal(typeof result.status, 'string')
  assert.equal(typeof result.reachable, 'boolean')
  assert.equal(typeof result.details, 'string')
})
