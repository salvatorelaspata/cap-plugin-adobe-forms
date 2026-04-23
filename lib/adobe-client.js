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

async function renderPDF({ templateName, payload, locale }) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
  const data = await callAdobe(`/v1/forms/${encodeURIComponent(templateName)}/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/pdf',
      'Accept-Language': locale || 'en'
    },
    data: body,
    responseType: 'arraybuffer'
  })
  return Buffer.isBuffer(data) ? data : Buffer.from(data)
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

module.exports = { renderPDF, listForms, getFormDetails, health, remoteHealth }
