const { describe, it, mock, afterEach } = require('node:test')
const assert = require('node:assert/strict')

// Deve essere configurato prima di require('../lib/adobe-client')
// in modo che hasDirectCredentials() ritorni true in tutti i test
const cds = require('@sap/cds')
cds.env.requires ??= {}
cds.env.requires.adobeForms = {
  credentials: {
    baseUrl:      'https://mock-adobe.local',
    tokenUrl:     'https://mock-xsuaa.local/oauth/token',
    clientId:     'test-client-id',
    clientSecret: 'test-secret'
  }
}

const client = require('../lib/adobe-client')

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MOCK_TOKEN = { access_token: 'mock-bearer-token', expires_in: 3600 }

const MOCK_FORMS_LIST = [
  { id: 'DELIBERA', description: 'Delibera comunale' },
  { id: 'INVOICE',  description: 'Invoice template'  }
]

const MOCK_FORM_DETAILS = {
  id: 'DELIBERA',
  description: 'Delibera comunale',
  schema: { Header: { NumeroDelibera: 'string', Anno: 'integer', Data: 'date' } }
}

const MOCK_PDF = Buffer.from('%PDF-1.7 mock-pdf-content')

const SAMPLE_PAYLOAD = {
  Header: { NumeroDelibera: '12345', Anno: 2026, Data: '2026-04-23' },
  TabellaStringhe: { Riga: [{ Testo: 'Prima riga' }] }
}

// ─── Infrastruttura di mocking ────────────────────────────────────────────────

let _stub = null

afterEach(() => { _stub?.mock.restore(); _stub = null })

/**
 * Sostituisce global.fetch per la durata di un test.
 * Le richieste al token endpoint vengono soddisfatte automaticamente.
 * Le altre vengono delegate ad apiHandler(url, init).
 */
function stubFetch(apiHandler) {
  _stub = mock.method(global, 'fetch', async (url, init) => {
    if (String(url).includes('/oauth/token'))
      return { ok: true, status: 200, json: async () => MOCK_TOKEN, text: async () => JSON.stringify(MOCK_TOKEN) }
    return apiHandler(url, init)
  })
  return _stub
}

/** Ritorna le chiamate fetch che NON riguardano il token endpoint. */
function apiCalls() {
  return (_stub?.mock.calls ?? []).filter(c => !String(c.arguments[0]).includes('/oauth/token'))
}

// Builders di response mock
const ok = {
  json: body => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) }),
  text: body => ({ ok: true, status: 200, text: async () => body, json: async () => JSON.parse(body) }),
  binary: buf => {
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    return { ok: true, status: 200, arrayBuffer: async () => ab }
  }
}

const err = (status, msg) => ({ ok: false, status, text: async () => msg })

// ─── health ───────────────────────────────────────────────────────────────────

describe('health', () => {
  it('ritorna sempre UP con il nome del servizio', async () => {
    const result = await client.health()
    assert.equal(result.status, 'UP')
    assert.match(result.service, /Adobe/)
  })
})

// ─── remoteHealth ─────────────────────────────────────────────────────────────

describe('remoteHealth', () => {
  it('ritorna un payload strutturato anche quando il destination non è raggiungibile', async () => {
    const result = await client.remoteHealth()
    assert.equal(typeof result.status,        'string')
    assert.equal(typeof result.reachable,     'boolean')
    assert.equal(typeof result.authenticated, 'boolean')
    assert.equal(typeof result.details,       'string')
    assert.ok('service'         in result)
    assert.ok('destinationName' in result)
    assert.ok('endpoint'        in result)
  })

  it('ritorna UP quando l\'endpoint risponde correttamente', async () => {
    stubFetch(() => ok.text('[]'))
    const result = await client.remoteHealth()
    assert.equal(result.status,        'UP')
    assert.equal(result.reachable,     true)
    assert.equal(result.authenticated, true)
  })

  it('ritorna DOWN con i dettagli dell\'errore quando l\'API risponde con errore', async () => {
    stubFetch(() => err(503, 'Service Unavailable'))
    const result = await client.remoteHealth()
    assert.equal(result.status,    'DOWN')
    assert.equal(result.reachable, false)
    assert.match(result.details,   /503/)
  })
})

// ─── listForms ────────────────────────────────────────────────────────────────

describe('listForms', () => {
  it('chiama GET /v1/forms e ritorna i dati deserializzati', async () => {
    stubFetch(() => ok.json(MOCK_FORMS_LIST))
    const result = await client.listForms()
    assert.deepEqual(result, MOCK_FORMS_LIST)
  })

  it('chiama il path corretto', async () => {
    stubFetch(() => ok.json([]))
    await client.listForms()
    assert.equal(apiCalls()[0].arguments[0], 'https://mock-adobe.local/v1/forms')
  })

  it('usa il metodo GET', async () => {
    stubFetch(() => ok.json([]))
    await client.listForms()
    assert.equal(apiCalls()[0].arguments[1].method, 'GET')
  })

  it('propaga ADOBE_FORMS_API_FAILED in caso di errore HTTP', async () => {
    stubFetch(() => err(503, 'Service Unavailable'))
    await assert.rejects(
      () => client.listForms(),
      e => { assert.equal(e.code, 'ADOBE_FORMS_API_FAILED'); assert.equal(e.status, 503); return true }
    )
  })
})

// ─── getFormDetails ───────────────────────────────────────────────────────────

describe('getFormDetails', () => {
  it('chiama GET /v1/forms/{formId} e ritorna i dettagli', async () => {
    stubFetch(() => ok.json(MOCK_FORM_DETAILS))
    const result = await client.getFormDetails('DELIBERA')
    assert.deepEqual(result, MOCK_FORM_DETAILS)
    assert.equal(apiCalls()[0].arguments[0], 'https://mock-adobe.local/v1/forms/DELIBERA')
  })

  it('applica URL-encoding ai caratteri speciali nel formId', async () => {
    stubFetch(() => ok.json({}))
    await client.getFormDetails('FORM/CON SPAZI')
    assert.equal(apiCalls()[0].arguments[0], 'https://mock-adobe.local/v1/forms/FORM%2FCON%20SPAZI')
  })

  it('propaga ADOBE_FORMS_API_FAILED quando il form non esiste', async () => {
    stubFetch(() => err(404, 'Not Found'))
    await assert.rejects(
      () => client.getFormDetails('INESISTENTE'),
      e => { assert.equal(e.code, 'ADOBE_FORMS_API_FAILED'); assert.equal(e.status, 404); return true }
    )
  })
})

// ─── renderPDF ────────────────────────────────────────────────────────────────

describe('renderPDF', () => {
  it('ritorna un Buffer in caso di successo', async () => {
    stubFetch(() => ok.binary(MOCK_PDF))
    const result = await client.renderPDF({ templateName: 'DELIBERA', payload: SAMPLE_PAYLOAD, locale: 'it' })
    assert.ok(Buffer.isBuffer(result))
    assert.deepEqual(result, MOCK_PDF)
  })

  it('chiama POST /v1/forms/{templateName}/render', async () => {
    stubFetch(() => ok.binary(MOCK_PDF))
    await client.renderPDF({ templateName: 'DELIBERA', payload: SAMPLE_PAYLOAD })
    const call = apiCalls()[0]
    assert.equal(call.arguments[0], 'https://mock-adobe.local/v1/forms/DELIBERA/render')
    assert.equal(call.arguments[1].method, 'POST')
  })

  it('applica URL-encoding ai caratteri speciali nel templateName', async () => {
    stubFetch(() => ok.binary(MOCK_PDF))
    await client.renderPDF({ templateName: 'MY FORM', payload: SAMPLE_PAYLOAD })
    assert.equal(apiCalls()[0].arguments[0], 'https://mock-adobe.local/v1/forms/MY%20FORM/render')
  })

  it('invia Content-Type application/json e Accept application/pdf', async () => {
    stubFetch(() => ok.binary(MOCK_PDF))
    await client.renderPDF({ templateName: 'DELIBERA', payload: SAMPLE_PAYLOAD, locale: 'it' })
    const { headers } = apiCalls()[0].arguments[1]
    assert.equal(headers['Content-Type'],   'application/json')
    assert.equal(headers['Accept'],         'application/pdf')
    assert.equal(headers['Accept-Language'], 'it')
  })

  it('usa "en" come locale di default quando non specificato', async () => {
    stubFetch(() => ok.binary(MOCK_PDF))
    await client.renderPDF({ templateName: 'DELIBERA', payload: SAMPLE_PAYLOAD })
    assert.equal(apiCalls()[0].arguments[1].headers['Accept-Language'], 'en')
  })

  it('accetta il payload come oggetto JavaScript', async () => {
    stubFetch(() => ok.binary(MOCK_PDF))
    const result = await client.renderPDF({ templateName: 'DELIBERA', payload: SAMPLE_PAYLOAD })
    assert.ok(Buffer.isBuffer(result))
  })

  it('accetta il payload come stringa JSON', async () => {
    stubFetch(() => ok.binary(MOCK_PDF))
    const result = await client.renderPDF({ templateName: 'DELIBERA', payload: JSON.stringify(SAMPLE_PAYLOAD) })
    assert.ok(Buffer.isBuffer(result))
  })

  it('propaga ADOBE_FORMS_API_FAILED in caso di errore HTTP', async () => {
    stubFetch(() => err(400, 'Bad Request'))
    await assert.rejects(
      () => client.renderPDF({ templateName: 'DELIBERA', payload: SAMPLE_PAYLOAD }),
      e => { assert.equal(e.code, 'ADOBE_FORMS_API_FAILED'); assert.equal(e.status, 400); return true }
    )
  })
})
