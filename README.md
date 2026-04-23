# cap-plugin-adobe-forms

Reusable SAP CAP Node.js plugin that wraps SAP Forms service by Adobe on SAP BTP.

## What is included

- Standard CAP plugin bootstrap through `cds-plugin.js`.
- Unbound CAP actions for PDF rendering and health checks.
- Remote health check against the Adobe endpoint.
- Preferred integration via SAP BTP Destination service using SAP Cloud SDK.
- Optional fallback to direct OAuth client-credentials configuration.

## Installation

```bash
npm install cap-plugin-adobe-forms
```

## Recommended configuration: Destination service

The preferred setup is a BTP HTTP destination with `OAuth2ClientCredentials`, because SAP Cloud SDK can resolve destinations by name and execute requests through the destination abstraction.[1][2]

Example consumer configuration:

```json
{
  "cds": {
    "requires": {
      "adobeForms": {
        "destination": "ADOBE_FORMS_API",
        "healthPath": "/v1/forms"
      }
    }
  }
}
```

Recommended destination values:

- Name: `ADOBE_FORMS_API`
- Type: `HTTP`
- Proxy Type: `Internet`
- Authentication: `OAuth2ClientCredentials`
- URL: Adobe REST API base URL from the Adobe service key
- Client ID: `clientid`
- Client Secret: `clientsecret`
- Token Service URL: XSUAA URL + `/oauth/token`

## Direct credential fallback

If Destination service is not available, the plugin can fall back to direct credentials:

```json
{
  "cds": {
    "requires": {
      "adobeForms": {
        "credentials": {
          "baseUrl": "https://<adsrestapi-host>",
          "tokenUrl": "https://<xsuaa-host>/oauth/token",
          "clientId": "<clientid>",
          "clientSecret": "<clientsecret>"
        }
      }
    }
  }
}
```

## Exposed CAP actions

```cds
service AdobeFormsService {
  action renderPDF(templateName : String, payload : LargeString, locale : String) returns LargeBinary;
  action health() returns HealthStatus;
  action remoteHealth() returns RemoteHealthStatus;
}
```

- `health()` checks local plugin health.
- `remoteHealth()` resolves the destination and performs a real outbound call against the configured Adobe endpoint.

## Health check behavior

The remote health check is intentionally lightweight and is meant to validate real connectivity, destination resolution, and authentication to the Adobe endpoint, which aligns with dependency-aware health check practices.[3]

## SAP Cloud SDK note

SAP Cloud SDK supports fetching destinations by name using functions such as `getDestination(...)`, and it can execute outbound HTTP requests against a resolved destination abstraction.[1][2]

## Best practices applied

- Destination service first, direct credentials only as fallback.
- Technical wrapper via unbound actions instead of raw proxying.
- Separation of config, destination resolution, OAuth, HTTP client, handlers, and error translation.
- Remote dependency health check separated from local CAP health.
- Token caching only for direct credential mode.
- Minimal package surface and explicit environment-driven configuration.

## Important note

The exact Adobe REST endpoint paths can vary by service flavor or tenant setup, so validate `render` and `healthPath` values in your target landscape before productive use.

## Sources

[1] SAP Cloud SDK documentation explains destination retrieval by name and the search/resolution behavior.
[2] SAP Community and SAP Cloud SDK references show destination-based outbound calls and destination resolution patterns in Node.js.
[3] CAP health-check guidance and general health-check best practices recommend lightweight checks and separate dependency verification.
