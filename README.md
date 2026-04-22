# cap-plugin-adobe-forms

Reusable SAP CAP Node.js plugin that wraps SAP Forms service by Adobe on SAP BTP.

## Features

- Standard CAP plugin bootstrap through `cds-plugin.js`.
- Unbound CAP actions for PDF rendering and health checks.
- Shared CDS types exported at namespace level for reuse by consumer apps.
- Remote health check against the Adobe endpoint.
- Preferred integration via SAP BTP Destination service using SAP Cloud SDK.
- Optional fallback to direct OAuth client-credentials configuration.

## Installation

```bash
npm install @salvatorela/cap-plugin-adobe-forms
```

## Recommended configuration: Destination service

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

## CDS contract

```cds
using { plugins.adobe as adobe } from 'cap-plugin-adobe-forms/srv/adobe-forms-service';

service DocumentService {
  action pluginHealth() returns adobe.HealthStatus;
  action pluginRemoteHealth() returns adobe.RemoteHealthStatus;
}
```

## Exposed CAP actions

```cds
namespace plugins.adobe;

type HealthStatus {
  status  : String;
  service : String;
}

type RemoteHealthStatus {
  status          : String;
  service         : String;
  destinationName : String;
  endpoint        : String;
  authenticated   : Boolean;
  reachable       : Boolean;
  details         : String;
}

service AdobeFormsService {
  action renderPDF(templateName : String, payload : LargeString, locale : String) returns LargeBinary;
  action health() returns HealthStatus;
  action remoteHealth() returns RemoteHealthStatus;
}
```

## Publish checklist

- Run `npm pack --dry-run` to inspect exactly what will be published.
- Verify the package name or replace it with your npm scope.
- Replace `repository`, `homepage`, and `bugs` URLs with your real repository.
- Publish from the plugin folder only, not from a mono-bundle root.

## Important note

Validate the exact Adobe REST endpoint paths in your tenant before productive use.

## Scoped package note

This variant is prepared for a public user-scoped npm package. The first publish of a scoped public package must use public access.
