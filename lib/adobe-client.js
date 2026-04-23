const { executeHttpRequest } = require('@sap-cloud-sdk/http-client')
const { getAdobeFormsSettings, hasDirectCredentials, getDirectCredentials } = require('./config')
const { getAccessToken } = require('./oauth')
const { resolveDestination } = require('./destination')

async function callViaDestination(path, { method = 'GET', headers = {}, data, responseType = 'json' } = {}) {
  const destination = await resolveDestination()
  const response = await executeHttpRequest(destination, { method, url: path, headers, data, responseType })
  return response.data
}

async function callViaDirectCredentials(path, { method = 'GET', headers = {}, data, responseType = 'json' } = {}) {
  const { baseUrl } = getDirectCredentials()
  const token = await getAccessToken()

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...headers },
    body: data
  })

  if (!response.ok) {
    const text = await response.text()
    const err = new Error(`Adobe Forms API failed with status ${response.status}: ${text}`)
    err.code = 'ADOBE_FORMS_API_FAILED'
    err.status = response.status
    throw err
  }

  if (responseType === 'arraybuffer') return Buffer.from(await response.arrayBuffer())
  if (responseType === 'text') return response.text()
  return response.json()
}

async function callAdobe(path, options = {}) {
  if (hasDirectCredentials()) return callViaDirectCredentials(path, options)
  return callViaDestination(path, options)
}

// Converte un oggetto JS in XML. Gli array vengono espansi come elementi fratelli con lo stesso tag.
function jsonToXml(obj, root = 'FormData') {
  function ser(val, tag) {
    if (Array.isArray(val)) return val.map(item => ser(item, tag)).join('')
    if (val !== null && typeof val === 'object') {
      return `<${tag}>${Object.entries(val).map(([k, v]) => ser(v, k)).join('')}</${tag}>`
    }
    return `<${tag}>${String(val)}</${tag}>`
  }
  return `<?xml version="1.0" encoding="UTF-8"?>${ser(obj, root)}`
}

// Normalizza il locale nel formato ll_LL richiesto dall'API ADS (es. 'it' → 'it_IT', 'it-IT' → 'it_IT').
function toFormLocale(locale) {
  if (!locale) return 'en_US'
  const s = locale.replace('-', '_')
  if (s.length === 2) return `${s}_${s.toUpperCase()}`
  return s
}

async function renderPDF({ templateName, payload, locale }) {
  const details = await getFormDetails(templateName)
  const tpl = details.templates?.[0]
  const xdpTemplate = typeof tpl === 'string' ? tpl : tpl?.xdpTemplate

  if (!xdpTemplate) {
    const err = new Error(`No XDP template found for form "${templateName}"`)
    err.code = 'ADOBE_FORMS_XDP_NOT_FOUND'
    throw err
  }

  const xmlString = typeof payload === 'string' ? payload : jsonToXml(payload)
  const xmlData = Buffer.from(xmlString, 'utf8').toString('base64')

  const body = JSON.stringify({
    xdpTemplate,
    xmlData,
    formType: 'print',
    formLocale: toFormLocale(locale),
    taggedPdf: 1,
    embedFont: 0,
    changeNotAllowed: false,
    printNotAllowed: false,
    useCustomLocale: false
  })

  const data = await callAdobe('/v1/adsRender/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    data: body,
    responseType: 'json'
  })
  // L'API restituisce il PDF come base64 nel campo fileContent
  const b64 = data?.fileContent ?? data
  return Buffer.from(b64, 'base64')
}

async function listForms() {
  return callAdobe('/v1/forms', {
    headers: { Accept: 'application/json' }
  })
}

async function getFormDetails(formId) {
  return callAdobe(`/v1/forms/${encodeURIComponent(formId)}`, {
    headers: { Accept: 'application/json' }
  })
}

async function getFormSchema(formId) {
  const details = await getFormDetails(formId)
  const { schema } = details
  if (!schema?.xsdSchema) {
    const err = new Error(`No schema found for form "${formId}"`)
    err.code = 'ADOBE_FORMS_SCHEMA_NOT_FOUND'
    throw err
  }
  return {
    formName: details.formName,
    schemaName: schema.schemaName,
    xsd: Buffer.from(schema.xsdSchema, 'base64').toString('utf8'),
    metaData: schema.metaData
  }
}

async function health() {
  return { status: 'UP', service: 'SAP Forms service by Adobe' }
}

async function remoteHealth() {
  const { destinationName, healthPath } = getAdobeFormsSettings()
  try {
    await callAdobe(healthPath, { responseType: 'text' })
    return {
      status: 'UP',
      service: 'SAP Forms service by Adobe',
      destinationName,
      endpoint: healthPath,
      authenticated: true,
      reachable: true,
      details: 'Destination resolved and remote endpoint reachable'
    }
  } catch (error) {
    return {
      status: 'DOWN',
      service: 'SAP Forms service by Adobe',
      destinationName,
      endpoint: healthPath,
      authenticated: false,
      reachable: false,
      details: error.message
    }
  }
}

module.exports = { renderPDF, listForms, getFormDetails, getFormSchema, health, remoteHealth }
