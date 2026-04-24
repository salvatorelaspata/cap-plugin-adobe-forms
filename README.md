# cap-plugin-adobe-forms

Reusable SAP CAP Node.js plugin that wraps **SAP Forms service by Adobe** on SAP BTP.

## Installation

```bash
npm install @salvatorela/cap-plugin-adobe-forms
```

## Configuration

The plugin supports two authentication modes. Destination service is preferred for BTP deployments; direct credentials are useful for local development.

### Option 1 — BTP Destination (recommended)

Configure an HTTP destination named `ADOBE_FORMS_API` with `OAuth2ClientCredentials` authentication in BTP Cockpit, then reference it in your CAP app:

```json
{
  "cds": {
    "requires": {
      "adobeForms": {
        "destination": "ADOBE_FORMS_API"
      }
    }
  }
}
```

Recommended destination settings:

| Field             | Value                                        |
| ----------------- | -------------------------------------------- |
| Name              | `ADOBE_FORMS_API`                            |
| Type              | `HTTP`                                       |
| Proxy Type        | `Internet`                                   |
| Authentication    | `OAuth2ClientCredentials`                    |
| URL               | Adobe REST API base URL from the service key |
| Client ID         | `uaa.clientid` from the service key          |
| Client Secret     | `uaa.clientsecret` from the service key      |
| Token Service URL | `uaa.url` + `/oauth/token`                   |

### Option 2 — Direct credentials (local development)

```json
{
  "cds": {
    "requires": {
      "adobeForms": {
        "credentials": {
          "baseUrl": "https://<adsrestapi-host>",
          "tokenUrl": "https://<xsuaa-host>/oauth/token",
          "clientId": "<uaa.clientid>",
          "clientSecret": "<uaa.clientsecret>"
        }
      }
    }
  }
}
```

> For local development with a `.env` file see [TEST.md](TEST.md).

---

## Usage

### Programmatic API (CAP service handler)

Connect to the service with `cds.connect.to` and call methods directly:

```js
const cds = require('@sap/cds')

module.exports = cds.service.impl(async function () {
  const adobeForms = await cds.connect.to('adobeForms')

  this.on('generateReport', async (req) => {
    // Render a PDF and return it as a Buffer
    const pdf = await adobeForms.renderPDF({
      templateName: 'MY_FORM',
      payload: {
        Header: { Title: 'Annual Report', Year: 2026 },
        Items: { Row: [{ Label: 'Revenue', Value: '1000' }] }
      },
      locale: 'it-IT'
    })
    return pdf // Buffer
  })

  this.on('listAvailableForms', async () => {
    return adobeForms.listForms()
  })

  this.on('getSchema', async (req) => {
    const { formId } = req.data
    return adobeForms.getFormSchema(formId)
  })
})
```

### Render PDF as base64

Pass `options.base64: true` to get a base64 string instead of a `Buffer` (useful for JSON responses or email attachments):

```js
const b64 = await adobeForms.renderPDF({
  templateName: 'MY_FORM',
  payload: { ... },
  options: { base64: true }
})
// b64 is a base64-encoded string
```

### Raw XML payload

If your data is already valid XML, pass it as a string — no conversion is applied:

```js
const pdf = await adobeForms.renderPDF({
  templateName: 'MY_FORM',
  payload: '<?xml version="1.0" encoding="UTF-8"?><FormData><Title>Hello</Title></FormData>'
})
```

### HTTP / OData (REST endpoint)

The plugin also exposes a CAP OData service at `/adobe/forms`. Call it directly via HTTP:

```bash
# List all forms
curl -X POST https://<app>/adobe/forms/listForms

# Render a PDF
curl -X POST https://<app>/adobe/forms/renderPDF \
  -H 'Content-Type: application/json' \
  -d '{"templateName":"MY_FORM","payload":"{\"Header\":{\"Title\":\"Test\"}}","locale":"it-IT"}' \
  --output report.pdf

# Health checks
curl -X POST https://<app>/adobe/forms/health
curl -X POST https://<app>/adobe/forms/remoteHealth
```

> **Note:** `options.base64` is only available via the programmatic API. The OData action always returns binary (`application/pdf`).

---

## CAP service

The plugin registers the service at path `/adobe/forms`.

```cds
@path: '/adobe/forms'
service AdobeFormsService {

  @Core.MediaType: 'application/pdf'
  action renderPDF(
    templateName : String(255),
    payload      : LargeString,
    locale       : String(10)
  ) returns LargeBinary;

  action listForms()                          returns LargeString;
  action getFormDetails(formId : String(255)) returns LargeString;
  action getFormSchema(formId  : String(255)) returns LargeString;

  action health()       returns HealthStatus;
  action remoteHealth() returns RemoteHealthStatus;
}
```

---

## API reference

### `renderPDF({ templateName, payload, locale, options })`

Renders a PDF for the given form template.

Internally the plugin:

1. Fetches the form details (`GET /v1/forms/{templateName}`) to retrieve the available XDP templates
2. Selects the template whose `language` matches the `locale` language code; falls back to the first template if no match is found
3. Converts `payload` to XML and base64-encodes it
4. Calls `POST /v1/adsRender/pdf` with `xdpTemplate` and `templateName` (from the selected template), then returns the decoded PDF as a `Buffer`

| Parameter        | Type               | Required | Description                                                                                                                              |
| ---------------- | ------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `templateName`   | `string`           | yes      | Form name as returned by `listForms`                                                                                                     |
| `payload`        | `object \| string` | yes      | Data to fill the form. JS objects are serialized to XML automatically. Strings are sent as-is (must be valid XML).                       |
| `locale`         | `string`           | no       | Locale in `ll`, `ll-LL` or `ll_LL` format (e.g. `it`, `it-IT`). Defaults to `en_US`. Used to select the matching language template variant. |
| `options.base64` | `boolean`          | no       | If `true`, returns the PDF as a base64 string instead of a `Buffer`. Defaults to `false`.                                                |

**Payload structure** — JS objects are converted to XML with the root element `FormData`:

```js
// Input
{
  Header: { NumeroDelibera: 'TEST-001', Anno: 2026, Data: '2026-04-23' },
  TabellaStringhe: { Riga: [{ Testo: 'Prima riga' }, { Testo: 'Seconda riga' }] }
}

// Serialized XML sent to the API
<?xml version="1.0" encoding="UTF-8"?>
<FormData>
  <Header>
    <NumeroDelibera>TEST-001</NumeroDelibera>
    <Anno>2026</Anno>
    <Data>2026-04-23</Data>
  </Header>
  <TabellaStringhe>
    <Riga><Testo>Prima riga</Testo></Riga>
    <Riga><Testo>Seconda riga</Testo></Riga>
  </TabellaStringhe>
</FormData>
```

**Returns:** `Buffer` (PDF binary)

---

### `listForms()`

Returns all form templates available in the Adobe Forms tenant.

`GET /v1/forms`

**Returns:** array of form objects, each with `formName`, `metaData`, `schema`, and `templates`.

---

### `getFormDetails(formId)`

Returns full details for a specific form, including the XSD schema and XDP templates.

`GET /v1/forms/{formId}`

| Parameter | Type     | Description                           |
| --------- | -------- | ------------------------------------- |
| `formId`  | `string` | Form name (URL-encoded automatically) |

**Returns:** form object with `formName`, `schema`, `templates`, `metaData`.

---

### `getFormSchema(formId)`

Returns the XSD schema of a form decoded as a plain string.

Internally calls `getFormDetails` and decodes `schema.xsdSchema` from base64.

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `formId`  | `string` | Form name   |

**Returns:**

```js
{
  formName:   'DELIBERA',
  schemaName: 'Schema',
  xsd:        '<?xml version="1.0"...>',  // decoded XSD
  metaData:   { objectId, versionNumber, creationDate, ... }
}
```

---

### `health()`

Returns local plugin health without making any outbound call.

**Returns:** `{ status: 'UP', service: 'SAP Forms service by Adobe' }`

---

### `remoteHealth()`

Resolves the destination (or direct credentials) and performs a real call to the configured `healthPath` (default: `GET /v1/forms`) to verify end-to-end connectivity.

**Returns:**

```js
{
  status:          'UP' | 'DOWN',
  service:         'SAP Forms service by Adobe',
  destinationName: 'ADOBE_FORMS_API',
  endpoint:        '/v1/forms',
  reachable:       true | false,
  authenticated:   true | false,
  details:         '...'
}
```

---

## Error codes

| Code                                | Thrown by           | Description                                            |
| ----------------------------------- | ------------------- | ------------------------------------------------------ |
| `ADOBE_FORMS_API_FAILED`            | all API calls       | HTTP error from the Adobe REST API (includes `status`) |
| `ADOBE_FORMS_CONFIG_MISSING`        | startup             | Required credential fields are missing                 |
| `ADOBE_FORMS_XDP_NOT_FOUND`         | `renderPDF`         | No XDP template found for the form (or the selected language variant) |
| `ADOBE_FORMS_SCHEMA_NOT_FOUND`      | `getFormSchema`     | The form has no `schema.xsdSchema` field               |
| `ADOBE_FORMS_DESTINATION_NOT_FOUND` | all API calls       | BTP destination resolved to `null` (destination mode) |
| `ADOBE_FORMS_OAUTH_FAILED`          | all API calls       | OAuth token endpoint returned an error (direct mode)  |

---

## Testing

See [TEST.md](TEST.md) for instructions on running unit tests and integration tests against a real BTP instance.

```bash
# Unit tests (no credentials needed)
npm test

# Integration test against real BTP service
node --env-file=.env test/integration.js
```
