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
module.exports = (data, require) => {
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
};
