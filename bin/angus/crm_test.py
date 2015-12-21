#!/usr/bin/env python
# A little script to verify the interactions with Angus's CRM SOAP interface.

import logging
from datetime import datetime

import suds.client
from xml.etree import ElementTree as ET

logging.basicConfig(level=logging.INFO)
logging.getLogger('suds.client').setLevel(logging.DEBUG)

ENDPOINT = 'https://webservicestest.angus.gov.uk/acwebservices.cfc?wsdl'

def get_auth_token(client):
    """
    Authenticates against Angus CRM and returns the auth token to use
    for subsequent requests.
    """
    root = ET.fromstring(client.service.AuthenticateJADU())
    if root.find("success").text.strip() == 'True':
        return root.find("AuthenticateResult").text.strip()
    else:
        return None

def dict_to_formfields_string(fields):
    """
    Converts a dict into an XML string suitable for use as the JADUFormFields value in the CreateServiceRequest call.
    """
    formfields = ET.Element("formfields")
    for key, value in fields.items():
        formfield = ET.SubElement(formfields, "formfield")
        ET.SubElement(formfield, "name").text = key
        ET.SubElement(formfield, "value").text = value
    return ET.tostring(formfields)

def create_service_request(client, token):
    """
    Issues a CreateServiceRequest call to the CRM endpoint with dummy data, to check it's working.
    Returns the request ID returned by the endpoint.
    """
    formfields = dict_to_formfields_string({
        'RequestTitle': "Test report",
        'RequestDetails': "This is a request. This field contains details of the request.",
        'ReporterName': "Test User",
        'ReporterEmail': 'test@example.org',
        'ReporterAnonymity': 'False',
        'ReportedDateTime': str(datetime.utcnow()),
        'ColumnId': '', # What is this for? Seems OK to leave it blank
        'ReportId': '123',
        'ReportedNorthing': '750781',
        'ReportedEasting': '345986',
        'Imageurl1': '',
        'Imageurl2': '',
        'Imageurl3': '',
    })

    params = {
        'authenticationtoken': token,
        'CallerId': '1',
        'CallerAddressId': '1',
        'DeliveryId': '1',
        'DeliveryAddressId': '1',
        'CRMRequestType': 'StLight',
        'JADUXFormRef': 'FMS',
        'PaymentRef': '',
        'JADUFormFields': formfields
    }

    root = ET.fromstring(client.service.CreateServiceRequest(**params))
    if root.find("success").text.strip() == 'True':
        return root.find("CreateRequestResult/RequestId").text.strip()
    else:
        raise Exception(root.find("message").text.strip())

def main():
    """
    Connect, authenticate, create a new service request and print its ID.
    """
    client = suds.client.Client(ENDPOINT, prettyxml=True)

    token = get_auth_token(client)
    if not token:
        raise Exception("Couldn't authenticate.")

    try:
        request_id = create_service_request(client, token)
        logging.info("SUCCESS! Created a new request, received ID: {}".format(request_id))
    except Exception as e:
        logging.error("ERROR! Couldn't create a new request. Error was: {}".format(e))

if __name__ == '__main__':
    main()
