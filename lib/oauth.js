const { URLSearchParams } = require('node:url')
const { getDirectCredentials } = require('./config')

let tokenCache = { value: null, expiresAt: 0 }

async function fetchAccessToken() {
  const { tokenUrl, clientId, clientSecret } = getDirectCredentials()
  const body = new URLSearchParams({ grant_type: 'client_credentials' })

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  })

  if (!response.ok) {
    const text = await response.text()
    const err = new Error(`OAuth token request failed with status ${response.status}: ${text}`)
    err.code = 'ADOBE_FORMS_OAUTH_FAILED'
    throw err
  }

  const json = await response.json()
  tokenCache = {
    value: json.access_token,
    expiresAt: Date.now() + Math.max((json.expires_in || 300) - 30, 30) * 1000
  }
  return tokenCache.value
}

async function getAccessToken() {
  if (tokenCache.value && Date.now() < tokenCache.expiresAt) return tokenCache.value
  return fetchAccessToken()
}

module.exports = { getAccessToken }
