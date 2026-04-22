const { executeHttpRequest } = require('@sap-cloud-sdk/http-client')
const { getAdobeFormsSettings, hasDirectCredentials, getDirectCredentials } = require('./config')
const { getAccessToken } = require('./oauth')
const { resolveDestination } = require('./destination')

async function callViaDestination(path, { method = 'GET', headers = {}, data, responseType = 'json', jwt } = {}) {
  const destination = await resolveDestination(jwt)

  return executeHttpRequest(destination, {
    method,
    url: path,
    headers,
    data,
    responseType
  })
}

async function callViaDirectCredentials(path, { method = 'GET', headers = {}, data, responseType = 'json' } = {}) {
  const { baseUrl } = getDirectCredentials()
  const token = await getAccessToken()

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...headers
    },
    body: data
  })

  if (!response.ok) {
    const text = await response.text()
    const err = new Error(`Adobe Forms API failed with status ${response.status}: ${text}`)
    err.code = 'ADOBE_FORMS_API_FAILED'
    err.status = response.status
    throw err
  }

  if (responseType === 'arraybuffer') return { data: Buffer.from(await response.arrayBuffer()) }
  if (responseType === 'text') return { data: await response.text() }
  return { data: await response.json() }
}

async function callAdobe(path, options = {}) {
  if (hasDirectCredentials()) return callViaDirectCredentials(path, options)
  return callViaDestination(path, options)
}

async function renderPDF({ templateName, payload, locale, jwt }) {
  const response = await callAdobe(`/v1/forms/${encodeURIComponent(templateName)}/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/pdf',
      'Accept-Language': locale || 'en'
    },
    data: JSON.stringify(payload),
    responseType: 'arraybuffer',
    jwt
  })
  return Buffer.isBuffer(response.data) ? response.data : Buffer.from(response.data)
}

async function health() {
  return { status: 'UP', service: 'SAP Forms service by Adobe wrapper' }
}

async function remoteHealth({ jwt }) {
  const { destinationName, healthPath } = getAdobeFormsSettings()
  try {
    await callAdobe(healthPath, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      responseType: 'text',
      jwt
    })

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

module.exports = { renderPDF, health, remoteHealth }
