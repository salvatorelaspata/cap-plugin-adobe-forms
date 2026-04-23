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

@path: '/adobe/forms'
service AdobeFormsService {

  @Core.MediaType: 'application/pdf'
  action renderPDF(
    templateName : String(255),
    payload      : LargeString,
    locale       : String(10)
  ) returns LargeBinary;

  action listForms()                            returns LargeString;
  action getFormDetails(formId : String(255))   returns LargeString;
  action getFormSchema(formId  : String(255))   returns LargeString;

  action health()       returns HealthStatus;
  action remoteHealth() returns RemoteHealthStatus;
}
