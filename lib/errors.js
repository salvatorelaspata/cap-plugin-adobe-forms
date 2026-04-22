function toCapError(req, error) {
  if (error.code === 'ADOBE_FORMS_CONFIG_MISSING') {
    return req.reject(500, 'Adobe Forms configuration is incomplete')
  }
  if (error.code === 'ADOBE_FORMS_OAUTH_FAILED') {
    return req.reject(502, 'Adobe Forms authentication failed')
  }
  if (error.code === 'ADOBE_FORMS_DESTINATION_NOT_FOUND') {
    return req.reject(500, 'Adobe Forms destination could not be resolved')
  }
  if (error.code === 'ADOBE_FORMS_API_FAILED') {
    return req.reject(error.status || 502, 'Adobe Forms request failed')
  }
  throw error
}

module.exports = { toCapError }
