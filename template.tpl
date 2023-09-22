___TERMS_OF_SERVICE___

By creating or modifying this file you agree to Google Tag Manager's Community
Template Gallery Developer Terms of Service available at
https://developers.google.com/tag-manager/gallery-tos (or such other URL as
Google may provide), as modified from time to time.


___INFO___

{
  "type": "TAG",
  "id": "cvt_temp_public_id",
  "version": 1,
  "securityGroups": [],
  "displayName": "LINE Conversion API",
  "categories": [
    "ADVERTISING",
    "ANALYTICS",
    "ATTRIBUTION",
    "CONVERSIONS",
    "MARKETING",
    "PERSONALIZATION",
    "REMARKETING"
  ],
  "brand": {
    "id": "brand_dummy",
    "displayName": ""
  },
  "description": "Server Side Tag Template for sending to LINE Conversion API",
  "containerContexts": [
    "SERVER"
  ]
}


___TEMPLATE_PARAMETERS___

[
  {
    "type": "TEXT",
    "name": "lineTagId",
    "displayName": "LINE Tag ID",
    "simpleValueType": true,
    "valueValidators": [
      {
        "type": "REGEX",
        "args": [
          "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
        ]
      }
    ],
    "help": "Please specify the ID of the LINE tag used to measure conversions."
  },
  {
    "type": "TEXT",
    "name": "lineAccessToken",
    "displayName": "LINE Conversion API Access Token",
    "simpleValueType": true,
    "help": "Please specify an access token issued on the LINE Business Manager."
  },
  {
    "type": "TEXT",
    "name": "lineChannelId",
    "displayName": "LINE Channel ID",
    "simpleValueType": true,
    "help": "This field is required if you want to measure conversions using your LINE user ID. You must specify the channel ID of the provider that issued the LINE user ID to send."
  },
  {
    "type": "SELECT",
    "name": "event",
    "displayName": "Event Type",
    "macrosInSelect": false,
    "selectItems": [
      {
        "value": "conversion",
        "displayValue": "Conversion/Custom Conversion"
      },
      {
        "value": "page_view",
        "displayValue": "Page View"
      }
    ],
    "simpleValueType": true,
    "help": "page_view: Page view event. It corresponds to the base code of LINE Tag, and conversion measurement is not performed.\n\nconversion: Conversion, or custom conversion event."
  },
  {
    "type": "CHECKBOX",
    "name": "enableFixedEventName",
    "checkboxText": "Enable fixed event name",
    "simpleValueType": true,
    "enablingConditions": [
      {
        "paramName": "event",
        "paramValue": "conversion",
        "type": "EQUALS"
      }
    ],
    "help": "Please enable this checkbox if you always want to send a fixed event name as the conversion event name."
  },
  {
    "type": "TEXT",
    "name": "eventName",
    "displayName": "Event Name",
    "simpleValueType": true,
    "valueValidators": [
      {
        "type": "REGEX",
        "args": [
          "^[A-Za-z0-9_\\-]{1,20}$"
        ]
      }
    ],
    "valueHint": "Conversion",
    "enablingConditions": [
      {
        "paramName": "enableFixedEventName",
        "paramValue": true,
        "type": "EQUALS"
      }
    ],
    "help": "Please specify `Conversion` in this field if you want to measure the default conversion. Others are handled as custom events."
  },
  {
    "type": "CHECKBOX",
    "name": "enableCookie",
    "checkboxText": "Enable measurement using cookies",
    "simpleValueType": true,
    "help": "Please enable this checkbox if you want to read/update the first-party cookie `__lt__cid` for measurement with the LINE Tag. This enables server side tag to measure conversions with the first-party cookie in the Conversion API."
  },
  {
    "type": "CHECKBOX",
    "name": "testFlag",
    "checkboxText": "Enable testing Conversion API Event",
    "simpleValueType": true,
    "help": "Please enable this checkbox if you want to enable testing Conversion API Event. Events sent with this flag enabled will not be used for accumulation to audiences/reporting/ad delivery optimization and will only be used for testing purposes."
  }
]


___SANDBOXED_JS_FOR_SERVER___

/**
 * Copyright 2022 LINE Corporation
 *
 * LINE Corporation licenses this file to you under the Apache License,
 * version 2.0 (the "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at:
 *
 *   https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

// Constant Definitions
const LINE_CONVERSION_API_ENDPOINT = "https://conversion-api.tr.line.me/v1";
const BROWSER_ID_COOKIE_NAME = "__lt__cid";
const BROWSER_ID_COOKIE_MAX_AGE = 63072000; // 2 years
const CLICK_ID_QUERY_NAME = "ldtag_cl";
const CONTENT_TYPE_HEADER = "Content-Type";
const CONTENT_TYPE_APPLICATION_JSON = "application/json";
const HASHED_REGEX_PATTERN = "^[0-9a-fA-F]{64}$";
const LINE_STANDARD_EVENTS = [
  "ViewItemDetail",
  "AddToCart",
  "InitiateCheckOut",
  "Purchase",
  "GenerateLead",
  "CompleteReservation",
  "CompleteRegistration",
];

// HTTP Header Definitions
const CONVERSION_API_ACCESS_TOKEN_HEADER = "X-Line-TagAccessToken";
const CONVERSION_API_LINE_CHANNEL_ID_HEADER = "X-Line-ChannelID";

// Declaration of global logToConsole API
var logToConsole = require("logToConsole");

// Declaration of APIs used in Sandbox environment
const JSON = require("JSON");
const getType = require("getType");
const parseUrl = require("parseUrl");
const setCookie = require("setCookie");
const sha256Sync = require("sha256Sync");
const generateRandom = require("generateRandom");
const getCookieValues = require("getCookieValues");
const getAllEventData = require("getAllEventData");
const sendHttpRequest = require("sendHttpRequest");
const getTimestampMillis = require("getTimestampMillis");

// Start sending process to the Conversion API.
const eventData = getAllEventData();

// Parameter Definitions
const eventType = data.event || "page_view";
const lineTagId = data.lineTagId;
const accessToken = data.lineAccessToken;
const channelId = data.lineChannelId;
const enableCookie = data.enableCookie;
const testFlag = data.testFlag;
const url = eventData.page_location;
const lineClickId = url ? getLineClickId(parseUrl(url)) : undefined;
const browserId =
  getCookieValues(BROWSER_ID_COOKIE_NAME)[0] ||
  (enableCookie ? generateUuid() : undefined);
const title = eventData.page_title;
const referrer = eventData.page_referrer;
const ipAddress = eventData.ip_override;
const userAgent = eventData.user_agent;
const phone =
  eventData["x-line-hashed_phone"] ||
  (eventData.user_data && eventData.user_data.phone_number
    ? sha256HashIfNeeded(eventData.user_data.phone_number)
    : undefined);
const email =
  eventData["x-line-hashed_email"] ||
  (eventData.user_data && eventData.user_data.email_address
    ? sha256HashIfNeeded(eventData.user_data.email_address)
    : undefined);
const ifa = eventData["x-line-ifa"];
const externalId = eventData["x-line-external_id"];
const lineUserId = eventData["x-line-user_id"];
const eventName = getEventName();
const dedupe = eventData["x-line-deduplication_key"] || generateUuid();
const timestampSec = getTimestampMillis() / 1000;

const requestBody = {};

// Event Object
requestBody.event = {};
requestBody.event.source_type = "web";
requestBody.event.event_type = eventType;
requestBody.event.event_name =
  eventType === "conversion" ? eventName : undefined;
requestBody.event.deduplication_key = dedupe;
requestBody.event.event_timestamp = timestampSec;
requestBody.event.test_flag = testFlag;

// User Object
requestBody.user = {};
requestBody.user.click_id = lineClickId;
requestBody.user.browser_id = browserId;
requestBody.user.phone = phone;
requestBody.user.email = email;
requestBody.user.ifa = ifa;
requestBody.user.external_id = externalId;
requestBody.user.line_uid = lineUserId;

// Web Object
requestBody.web = {};
requestBody.web.title = title;
requestBody.web.url = url;
requestBody.web.referrer = referrer;
requestBody.web.ip_address = ipAddress;
requestBody.web.user_agent = userAgent;

// Custom Object (For standard event).
if (isStandardEvent(eventName)) {
  requestBody.custom = {};
  requestBody.custom.value = eventData["x-line-event-value"];
  requestBody.custom.currency = eventData["x-line-event-currency"];
}

// Send settings
const endpoint = LINE_CONVERSION_API_ENDPOINT + "/" + lineTagId + "/events";
const options = {};
options.method = "POST";
options.headers = {};
options.headers[CONTENT_TYPE_HEADER] = CONTENT_TYPE_APPLICATION_JSON;
options.headers[CONVERSION_API_ACCESS_TOKEN_HEADER] = accessToken;
options.headers[CONVERSION_API_LINE_CHANNEL_ID_HEADER] = channelId;
return sendHttpRequest(endpoint, options, JSON.stringify([requestBody]))
  .then((result) => {
    if (isValidRequest(result.statusCode)) {
      if (enableCookie && browserId) {
        setBrowserIdCookie(browserId);
      }
      // Call data.gtmOnSuccess at the end of the tag.
      data.gtmOnSuccess();
    } else if (isBadRequest(result.statusCode)) {
      logToConsole(
        "Failed to send to Conversion API because of BadRequest",
        result
      );
      data.gtmOnFailure();
    } else if (isInternalError(result.statusCode)) {
      logToConsole(
        "Failed to send to Conversion API because of InternalErrror",
        result
      );
      data.gtmOnFailure();
    } else {
      logToConsole(
        "Failed to send to Conversion API because of Server UnknownError",
        result
      );
      data.gtmOnFailure();
    }
  })
  .catch((rejected) => {
    // https://developers.google.com/tag-platform/tag-manager/server-side/api?hl=ja#sendhttpget
    if (rejected.reason === "failed") {
      logToConsole(
        "Failed to send to Conversion API because of UnknownError",
        rejected
      );
      data.gtmOnFailure();
    } else if (rejected.reason === "timed_out") {
      logToConsole(
        "Failed to send to Conversion API because of RequestTimeout",
        rejected
      );
      data.gtmOnFailure();
    } else {
      logToConsole(
        "Failed to send to Conversion API because of UnknownError",
        rejected
      );
      data.gtmOnFailure();
    }
  });

// Get the click ID that represents the click of the LINE ad.
function getLineClickId(url) {
  const params = url.searchParams[CLICK_ID_QUERY_NAME];
  const type = getType(params);
  if (type === "array") {
    return params[0];
  } else if (type === "string") {
    return params;
  }
}

function isValidRequest(statusCode) {
  return statusCode >= 200 && statusCode < 300;
}

function isBadRequest(statusCode) {
  return statusCode >= 400 && statusCode < 500;
}

function isInternalError(statusCode) {
  return statusCode >= 500 && statusCode < 600;
}

function isStandardEvent(eventName) {
  for (let i = 0; i < LINE_STANDARD_EVENTS.length; ++i) {
    if (LINE_STANDARD_EVENTS[i] === eventName) {
      return true;
    }
  }
  return false;
}

function getEventName() {
  if (data.eventName) {
    return data.eventName;
  }
  return eventData.event_name;
}

// googlearchive/chrome-platform-analytics - Apache License 2.0
// https://github.com/googlearchive/chrome-platform-analytics/blob/5c2c25079bdbc9ce125fb2eeb84ff6fa580e8d0c/src/internal/identifier.js#L44
function generateUuid() {
  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".split("");
  for (let i = 0; i < template.length; i++) {
    switch (template[i]) {
      case "x":
        template[i] = generateRandom(0, 15).toString(16);
        break;
      case "y":
        template[i] = (generateRandom(0, 3) + 8).toString(16);
        break;
    }
  }
  return template.join("");
}

function sha256HashIfNeeded(value) {
  if (!value) {
    return;
  }
  if (value.match(HASHED_REGEX_PATTERN)) {
    return value.toLowerCase();
  }
  return sha256Sync(value.trim().toLowerCase(), { outputEncoding: "hex" });
}

function setBrowserIdCookie(browserId) {
  setCookie(BROWSER_ID_COOKIE_NAME, browserId, {
    domain: "auto",
    path: "/",
    samesite: "Lax",
    secure: true,
    "max-age": BROWSER_ID_COOKIE_MAX_AGE,
    httpOnly: false,
  });
}


___SERVER_PERMISSIONS___

[
  {
    "instance": {
      "key": {
        "publicId": "get_cookies",
        "versionId": "1"
      },
      "param": [
        {
          "key": "cookieAccess",
          "value": {
            "type": 1,
            "string": "specific"
          }
        },
        {
          "key": "cookieNames",
          "value": {
            "type": 2,
            "listItem": [
              {
                "type": 1,
                "string": "__lt__cid"
              }
            ]
          }
        }
      ]
    },
    "clientAnnotations": {
      "isEditedByUser": true
    },
    "isRequired": true
  },
  {
    "instance": {
      "key": {
        "publicId": "set_cookies",
        "versionId": "1"
      },
      "param": [
        {
          "key": "allowedCookies",
          "value": {
            "type": 2,
            "listItem": [
              {
                "type": 3,
                "mapKey": [
                  {
                    "type": 1,
                    "string": "name"
                  },
                  {
                    "type": 1,
                    "string": "domain"
                  },
                  {
                    "type": 1,
                    "string": "path"
                  },
                  {
                    "type": 1,
                    "string": "secure"
                  },
                  {
                    "type": 1,
                    "string": "session"
                  }
                ],
                "mapValue": [
                  {
                    "type": 1,
                    "string": "__lt__cid"
                  },
                  {
                    "type": 1,
                    "string": "*"
                  },
                  {
                    "type": 1,
                    "string": "*"
                  },
                  {
                    "type": 1,
                    "string": "any"
                  },
                  {
                    "type": 1,
                    "string": "any"
                  }
                ]
              }
            ]
          }
        }
      ]
    },
    "clientAnnotations": {
      "isEditedByUser": true
    },
    "isRequired": true
  },
  {
    "instance": {
      "key": {
        "publicId": "read_event_data",
        "versionId": "1"
      },
      "param": [
        {
          "key": "eventDataAccess",
          "value": {
            "type": 1,
            "string": "any"
          }
        }
      ]
    },
    "clientAnnotations": {
      "isEditedByUser": true
    },
    "isRequired": true
  },
  {
    "instance": {
      "key": {
        "publicId": "send_http",
        "versionId": "1"
      },
      "param": [
        {
          "key": "allowedUrls",
          "value": {
            "type": 1,
            "string": "specific"
          }
        },
        {
          "key": "urls",
          "value": {
            "type": 2,
            "listItem": [
              {
                "type": 1,
                "string": "https://conversion-api.tr.line.me/*"
              }
            ]
          }
        }
      ]
    },
    "clientAnnotations": {
      "isEditedByUser": true
    },
    "isRequired": true
  },
  {
    "instance": {
      "key": {
        "publicId": "logging",
        "versionId": "1"
      },
      "param": [
        {
          "key": "environments",
          "value": {
            "type": 1,
            "string": "debug"
          }
        }
      ]
    },
    "clientAnnotations": {
      "isEditedByUser": true
    },
    "isRequired": true
  }
]


___TESTS___

scenarios:
- name: It should succeed that this tag template sends a event if the LINE Conversion
    API returns response with 202 accepted status
  code: |-
    runCode(mockData)
      .then(() => requestValidator())
      .finally(() => {
        assertApi("setCookie").wasCalledWith("__lt__cid", resultRequests[0].user.browser_id, {
          domain: 'auto',
          path: '/',
          samesite: 'Lax',
          secure: true,
          'max-age': 63072000,
          httpOnly: false
        });
        assertApi('gtmOnSuccess').wasCalled();
        assertApi('gtmOnFailure').wasNotCalled();
      });
- name: It shouldn't set any cookies if enableCookie is false
  code: |-
    mockData.enableCookie = false;

    runCode(mockData)
      .then(() => requestValidator())
      .finally(() => {
        assertApi("setCookie").wasNotCalled();
        assertApi('gtmOnSuccess').wasCalled();
        assertApi('gtmOnFailure').wasNotCalled();
      });
- name: It should succeed that this tag template get a click id from the page_location
    if the ldtag_cl parameter exists
  code: |-
    const clickId = "dummy_click_id";
    mockEventData.page_location = "http://example.com/?ldtag_cl=" + clickId;
    expectedRequest.url = mockEventData.page_location;
    expectedRequest.clickId = clickId;

    runCode(mockData)
      .then(() => requestValidator())
      .finally(() => {
        assertApi("setCookie").wasCalled();
        assertApi('gtmOnSuccess').wasCalled();
        assertApi('gtmOnFailure').wasNotCalled();
      });
- name: It should fail because of bad request response
  code: |-
    stubPromiseProvider = () => {
      return Promise.create((resolve, reject) => {
        resolve({
          "statusCode": 400,
          "body": undefined,
          "headers": []
        });
      });
    };

    runCode(mockData)
      .then(() => requestValidator())
      .finally(() => {
        assertApi('gtmOnSuccess').wasNotCalled();
        assertApi('gtmOnFailure').wasCalled();
      });
- name: It should fail because of internal error request response
  code: |-
    stubPromiseProvider = () => {
      return Promise.create((resolve, reject) => {
        resolve({
          "statusCode": 500,
          "body": undefined,
          "headers": []
        });
      });
    };

    runCode(mockData)
      .then(() => requestValidator())
      .finally(() => {
        assertApi('gtmOnSuccess').wasNotCalled();
        assertApi('gtmOnFailure').wasCalled();
      });
- name: It should fail because the request was rejected by some reason
  code: |-
    stubPromiseProvider = () => {
      return Promise.create((resolve, reject) => {
        reject({
          "reason": "failed"
        });
      });
    };

    runCode(mockData)
      .then(() => requestValidator())
      .finally(() => {
        assertApi('gtmOnSuccess').wasNotCalled();
        assertApi('gtmOnFailure').wasCalled();
      });
- name: It should fail because the request was rejected by time out
  code: |-
    stubPromiseProvider = () => {
      return Promise.create((resolve, reject) => {
        reject({
          "reason": "timed_out"
        });
      });
    };

    runCode(mockData)
      .then(() => requestValidator())
      .finally(() => {
        assertApi('gtmOnSuccess').wasNotCalled();
        assertApi('gtmOnFailure').wasCalled();
      });
- name: It should success that sending standard event with price and purchase
  code: |-
    mockData.eventName = 'Purchase';
    mockEventData['x-line-event-value'] = 100;
    mockEventData['x-line-event-currency'] = 'JPY';

    runCode(mockData)
      .then(() => {
        requestValidator();
        assertThat(resultRequests[0].custom.value).isEqualTo(100);
        assertThat(resultRequests[0].custom.currency).isEqualTo('JPY');
      })
      .finally(() => {
        assertApi("setCookie").wasCalledWith("__lt__cid", resultRequests[0].user.browser_id, {
          domain: 'auto',
          path: '/',
          samesite: 'Lax',
          secure: true,
          'max-age': 63072000,
          httpOnly: false
        });
        assertApi('gtmOnSuccess').wasCalled();
        assertApi('gtmOnFailure').wasNotCalled();
      });
setup: "var logToConsole = require('logToConsole');\nvar Promise = require('Promise');\n\
  var JSON = require('JSON');\n\nconst mockData = {\n  event: 'page_view',\n  lineTagId:\
  \ '00000000-0000-0000-0000-000000000000',\n  eventName: undefined,\n  lineAccessToken:\
  \ 'dummyAccessToken',\n  lineChannelId: undefined,\n  enableCookie: true\n};\n\n\
  const mockEventData = {\n  event_name: 'Conversion',\n  page_referrer: 'http://referrer.example.com',\n\
  \  page_title: 'Page Title',\n  page_location: 'http://example.com',\n  ip_override:\
  \ '127.0.0.1',\n  user_agent: 'Chrome',\n  'x-line-hashed_phone': undefined,\n \
  \ 'x-line-hashed_email': undefined,\n  'x-line-user_id': undefined,\n  'x-line-ifa':\
  \ undefined,\n  'x-line-external_id': undefined,\n  'x-line-deduplication_key':\
  \ \"dummy_dedupe\"\n};\n\nmock('getAllEventData', mockEventData);\n\nconst mockCookies\
  \ = ['00000000-0000-0000-0000-000000000001'];\nmock('getCookieValues', mockCookies);\n\
  \nlet stubPromiseProvider = () => {\n  return Promise.create((resolve, reject) =>\
  \ {\n    resolve({\n      \"statusCode\": 202,\n      \"body\": undefined,\n   \
  \   \"headers\": []\n    });\n  });\n};\n\nlet resultEndpointUrl, resultOptions,\
  \ resultRequests;\nmock('sendHttpRequest', (url, options, postBody) => {\n  resultEndpointUrl\
  \ = url;\n  resultOptions = options;\n  resultRequests = JSON.parse(postBody);\n\
  \  \n  return stubPromiseProvider();\n});\n\nconst expectedRequest = {\n  endpointUrl:\
  \ 'https://conversion-api.tr.line.me/v1/00000000-0000-0000-0000-000000000000/events',\n\
  \  method: 'POST',\n  accessToken: 'dummyAccessToken',\n  sourceType: 'web',\n \
  \ eventType: 'page_view',\n  title: 'Page Title',\n  url: 'http://example.com',\n\
  \  referrer: 'http://referrer.example.com',\n  ipAddress: '127.0.0.1',\n  userAgent:\
  \ 'Chrome',\n  channelId: undefined,\n  eventName: undefined,\n  deduplicationKey:\
  \ \"dummy_dedupe\",\n  clickId: undefined,\n  phone: undefined,\n  email: undefined,\n\
  \  ifa: undefined,\n  externalId: undefined,\n  lineUid: undefined\n};\n\nconst\
  \ requestValidator = () => {\n  assertThat(resultEndpointUrl).isEqualTo(expectedRequest.endpointUrl);\n\
  \  assertThat(resultOptions.method).isEqualTo(expectedRequest.method);\n  assertThat(resultOptions.headers['X-Line-TagAccessToken']).isEqualTo(expectedRequest.accessToken);\n\
  \  assertThat(resultOptions.headers['X-Line-ChannelID']).isEqualTo(expectedRequest.channelId);\n\
  \  assertThat(resultRequests).hasLength(1);\n  assertThat(resultRequests[0].event.source_type).isEqualTo(expectedRequest.sourceType);\n\
  \  assertThat(resultRequests[0].event.event_type).isEqualTo(expectedRequest.eventType);\n\
  \  assertThat(resultRequests[0].event.event_name).isEqualTo(expectedRequest.eventName);\n\
  \  assertThat(resultRequests[0].event.deduplication_key).isEqualTo(expectedRequest.deduplicationKey);\n\
  \  assertThat(resultRequests[0].user.browser_id).isEqualTo(mockCookies[0]);\n  assertThat(resultRequests[0].user.click_id).isEqualTo(expectedRequest.clickId);\n\
  \  assertThat(resultRequests[0].user.phone).isEqualTo(expectedRequest.phone);\n\
  \  assertThat(resultRequests[0].user.email).isEqualTo(expectedRequest.email);\n\
  \  assertThat(resultRequests[0].user.ifa).isEqualTo(expectedRequest.ifa);\n  assertThat(resultRequests[0].user.external_id).isEqualTo(expectedRequest.externalId);\n\
  \  assertThat(resultRequests[0].user.line_uid).isEqualTo(expectedRequest.lineUid);\n\
  \  assertThat(resultRequests[0].web.title).isEqualTo(expectedRequest.title);\n \
  \ assertThat(resultRequests[0].web.url).isEqualTo(expectedRequest.url);\n  assertThat(resultRequests[0].web.referrer).isEqualTo(expectedRequest.referrer);\n\
  \  assertThat(resultRequests[0].web.ip_address).isEqualTo(expectedRequest.ipAddress);\n\
  \  assertThat(resultRequests[0].web.user_agent).isEqualTo(expectedRequest.userAgent);\n\
  };\n"


___NOTES___

Created on 2022/4/28 19:09:50


