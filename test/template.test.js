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
const template = require("../src/template_code");
const expect = require("chai").expect;

const requireFunctionBase = {
  JSON: JSON,
  getType: (value) => {
    if (Array.isArray(value)) {
      return "array";
    } else {
      return typeof value;
    }
  },
  encodeUriComponent: encodeURIComponent,
  generateRandom: (min, max) => {
    return Math.floor(Math.random() * (max - min) + min);
  },
  getAllEventData: () => {
    return {
      event_name: "Conversion",
      page_referrer: "http://referrer.example.com",
      page_title: "Page Title",
      page_location: "http://example.com",
      ip_override: "127.0.0.1",
      user_agent: "Chrome",
      "x-line-hashed_phone": undefined,
      "x-line-hashed_email": undefined,
      "x-line-user_id": undefined,
      "x-line-ifa": undefined,
      "x-line-external_id": undefined,
      "x-line-deduplication_key": undefined,
    };
  },
  getCookieValues: () => {
    return [];
  },
  getTimestampMillis: Date.now,
  logToConsole: (...args) => {
    console.log(args);
  },
  Object: Object,
  parseUrl: (url) => {
    const parser = new URL(url);

    const searchParams = {};
    if (parser.searchParams) {
      parser.searchParams.forEach((v, k) => {
        searchParams[k] = v;
      });
    }

    return {
      href: parser.href,
      origin: parser.origin,
      protocol: parser.protocol,
      username: parser.username,
      password: parser.password,
      host: parser.host,
      hostname: parser.hostname,
      port: parser.port,
      pathname: parser.pathname,
      search: parser.search,
      searchParams: searchParams,
      hash: parser.hash,
    };
  },
  sendHttpRequest: (url, options, postBody) => {
    console.log(
      `sendHttpRequest was called.\nurl: ${url}\nbody: \n${postBody}\n`
    );
    return new Promise((resolve) => {
      resolve({
        statusCode: 202,
        body: undefined,
        headers: [],
      });
    });
  },
  setCookie: (name, value, options, noEncode) => {
    console.log(
      `set cookie: ${name}=${value}, options: ${options}, noEncode=${noEncode}`
    );
  },
  sha256Sync: (input) => {
    // dummy
    return input + "_sha256hashed";
  },
};

const getCallAssertion = () => {
  let count = 0;
  return {
    call: () => {
      count++;
    },
    once: () => {
      expect(count).to.be.eq(1);
    },
    never: () => {
      expect(count).to.be.eq(0);
    },
  };
};

describe("test", () => {
  it("should succeed that this tag template sends page_view event if the LINE Conversion API returns response with 202 accepted status", async () => {
    const successAssertion = getCallAssertion();
    const failureAssertion = getCallAssertion();
    await template(
      {
        event: "page_view",
        lineTagId: "00000000-0000-0000-0000-000000000000",
        eventName: undefined,
        lineAccessToken: "dummyAccessToken",
        lineChannelId: "dummyChannelId",
        enableCookie: true,
        testFlag: false,
        gtmOnSuccess: () => {
          successAssertion.call();
        },
        gtmOnFailure: () => {
          failureAssertion.call();
        },
      },
      (packageName) => {
        if (packageName === "getAllEventData") {
          return () => {
            const base = requireFunctionBase[packageName]();
            base.event_name = undefined;
            base["x-line-hashed_phone"] = "dummy_phone";
            base["x-line-hashed_email"] = "dummy_email";
            base["x-line-deduplication_key"] = "dummy_dedupe";
            base["x-line-ifa"] = "dummy_ifa";
            base["x-line-external_id"] = "dummy_external_id";
            base["x-line-user_id"] = "dummy_line_user_id";
            return base;
          };
        } else if (packageName === "sendHttpRequest") {
          return (url, options, postBody) => {
            expect(postBody).not.to.be.null;
            const requests = JSON.parse(postBody);

            expect(url).to.be.eq(
              "https://conversion-api.tr.line.me/v1/00000000-0000-0000-0000-000000000000/events"
            );

            expect(options.method).to.be.eq("POST");
            expect(options.headers["X-Line-TagAccessToken"]).to.be.eq(
              "dummyAccessToken"
            );
            expect(options.headers["X-Line-ChannelID"]).to.be.eq(
              "dummyChannelId"
            );

            expect(requests).length(1);
            expect(requests[0].event.source_type).to.be.eq("web");
            expect(requests[0].event.event_type).to.be.eq("page_view");
            expect(requests[0].event.event_name).to.be.undefined;
            expect(requests[0].event.deduplication_key).to.be.eq(
              "dummy_dedupe"
            );
            expect(requests[0].event.event_timestamp).to.be.closeTo(
              Date.now() / 1000,
              10
            );
            expect(requests[0].event.test_flag).to.be.false;

            expect(requests[0].user.click_id).to.be.undefined;
            expect(requests[0].user.browser_id).to.be.matches(
              /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/
            );
            expect(requests[0].user.phone).to.be.eq("dummy_phone");
            expect(requests[0].user.email).to.be.eq("dummy_email");
            expect(requests[0].user.ifa).to.be.eq("dummy_ifa");
            expect(requests[0].user.external_id).to.be.eq("dummy_external_id");
            expect(requests[0].user.line_uid).to.be.eq("dummy_line_user_id");

            expect(requests[0].web.title).to.be.eq("Page Title");
            expect(requests[0].web.url).to.be.eq("http://example.com");
            expect(requests[0].web.referrer).to.be.eq(
              "http://referrer.example.com"
            );
            expect(requests[0].web.ip_address).to.be.eq("127.0.0.1");
            expect(requests[0].web.user_agent).to.be.eq("Chrome");

            return new Promise((resolve) => {
              resolve({
                statusCode: 202,
                body: undefined,
                headers: [],
              });
            });
          };
        } else if (packageName === "setCookie") {
          return (name, value) => {
            expect(name).to.be.eq("__lt__cid");
            expect(value).to.be.matches(
              /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/
            );
          };
        }
        return requireFunctionBase[packageName];
      }
    );

    successAssertion.once();
    failureAssertion.never();
  });

  it("should succeed that this tag template sends identically phone number and email address specified in event data if those are already hashed", async () => {
    const successAssertion = getCallAssertion();
    const failureAssertion = getCallAssertion();
    await template(
      {
        event: "conversion",
        lineTagId: "00000000-0000-0000-0000-000000000000",
        lineAccessToken: "dummyAccessToken",
        lineChannelId: undefined,
        enableCookie: true,
        testFlag: false,
        gtmOnSuccess: () => {
          successAssertion.call();
        },
        gtmOnFailure: () => {
          failureAssertion.call();
        },
      },
      (packageName) => {
        if (packageName === "getAllEventData") {
          return () => {
            const base = requireFunctionBase[packageName]();
            base.user_data = {
              phone_number:
                "0000000000000000000000000000000000000000000000000000000000000000",
              email_address:
                "0000000000000000000000000000000000000000000000000000000000000000",
            };
            return base;
          };
        } else if (packageName === "sendHttpRequest") {
          return (url, options, postBody) => {
            expect(postBody).not.to.be.null;
            const requests = JSON.parse(postBody);

            expect(url).to.be.eq(
              "https://conversion-api.tr.line.me/v1/00000000-0000-0000-0000-000000000000/events"
            );

            expect(options.method).to.be.eq("POST");
            expect(options.headers["X-Line-TagAccessToken"]).to.be.eq(
              "dummyAccessToken"
            );
            expect(options.headers["X-Line-ChannelID"]).to.be.undefined;

            expect(requests).length(1);
            expect(requests[0].event.source_type).to.be.eq("web");
            expect(requests[0].event.event_type).to.be.eq("conversion");
            expect(requests[0].event.event_name).to.be.eq("Conversion");

            expect(requests[0].user.phone).to.be.eq(
              "0000000000000000000000000000000000000000000000000000000000000000"
            );
            expect(requests[0].user.email).to.be.eq(
              "0000000000000000000000000000000000000000000000000000000000000000"
            );

            return new Promise((resolve) => {
              resolve({
                statusCode: 202,
                body: undefined,
                headers: [],
              });
            });
          };
        }
        return requireFunctionBase[packageName];
      }
    );

    successAssertion.once();
    failureAssertion.never();
  });

  it("should succeed that this tag template sends phone number and email address specified in event data with hashed if those aren't hashed yet", async () => {
    const successAssertion = getCallAssertion();
    const failureAssertion = getCallAssertion();
    await template(
      {
        event: "conversion",
        lineTagId: "00000000-0000-0000-0000-000000000000",
        lineAccessToken: "dummyAccessToken",
        lineChannelId: undefined,
        enableCookie: true,
        testFlag: false,
        gtmOnSuccess: () => {
          successAssertion.call();
        },
        gtmOnFailure: () => {
          failureAssertion.call();
        },
      },
      (packageName) => {
        if (packageName === "getAllEventData") {
          return () => {
            const base = requireFunctionBase[packageName]();
            base.user_data = {
              phone_number: "dummy_raw_phone_number",
              email_address: "dummy_raw_email_address",
            };
            return base;
          };
        } else if (packageName === "sendHttpRequest") {
          return (url, options, postBody) => {
            expect(postBody).not.to.be.null;
            const requests = JSON.parse(postBody);

            expect(url).to.be.eq(
              "https://conversion-api.tr.line.me/v1/00000000-0000-0000-0000-000000000000/events"
            );

            expect(options.method).to.be.eq("POST");
            expect(options.headers["X-Line-TagAccessToken"]).to.be.eq(
              "dummyAccessToken"
            );
            expect(options.headers["X-Line-ChannelID"]).to.be.undefined;

            expect(requests).length(1);
            expect(requests[0].event.source_type).to.be.eq("web");
            expect(requests[0].event.event_type).to.be.eq("conversion");
            expect(requests[0].event.event_name).to.be.eq("Conversion");

            expect(requests[0].user.phone).to.be.eq(
              "dummy_raw_phone_number_sha256hashed"
            );
            expect(requests[0].user.email).to.be.eq(
              "dummy_raw_email_address_sha256hashed"
            );

            return new Promise((resolve) => {
              resolve({
                statusCode: 202,
                body: undefined,
                headers: [],
              });
            });
          };
        }
        return requireFunctionBase[packageName];
      }
    );

    successAssertion.once();
    failureAssertion.never();
  });

  it("should succeed that this tag template get a click id from the page_location if the ldtag_cl parameter exists", async () => {
    const successAssertion = getCallAssertion();
    const failureAssertion = getCallAssertion();
    await template(
      {
        event: "page_view",
        lineTagId: "00000000-0000-0000-0000-000000000000",
        eventName: undefined,
        lineAccessToken: "dummyAccessToken",
        lineChannelId: undefined,
        enableCookie: true,
        testFlag: false,
        gtmOnSuccess: () => {
          successAssertion.call();
        },
        gtmOnFailure: () => {
          failureAssertion.call();
        },
      },
      (packageName) => {
        if (packageName === "getAllEventData") {
          return () => {
            const base = requireFunctionBase[packageName]();
            base.page_location = "http://example.com?ldtag_cl=click_id";
            return base;
          };
        } else if (packageName === "sendHttpRequest") {
          return (url, options, postBody) => {
            expect(postBody).not.to.be.null;
            const requests = JSON.parse(postBody);

            expect(requests[0].user.click_id).to.be.eq("click_id");
            expect(requests[0].web.url).to.be.eq(
              "http://example.com?ldtag_cl=click_id"
            );

            return new Promise((resolve) => {
              resolve({
                statusCode: 202,
                body: undefined,
                headers: [],
              });
            });
          };
        }
        return requireFunctionBase[packageName];
      }
    );

    successAssertion.once();
    failureAssertion.never();
  });

  it("should set a first-party cookie field if it already exists", async () => {
    const successAssertion = getCallAssertion();
    const failureAssertion = getCallAssertion();
    await template(
      {
        event: "page_view",
        lineTagId: "00000000-0000-0000-0000-000000000000",
        eventName: undefined,
        lineAccessToken: "dummyAccessToken",
        lineChannelId: undefined,
        enableCookie: true,
        testFlag: false,
        gtmOnSuccess: () => {
          successAssertion.call();
        },
        gtmOnFailure: () => {
          failureAssertion.call();
        },
      },
      (packageName) => {
        if (packageName === "getCookieValues") {
          return (cookieName) => {
            expect(cookieName).to.be.eq("__lt__cid");
            return ["00000000-0000-0000-0000-000000000000"];
          };
        } else if (packageName === "sendHttpRequest") {
          return (url, options, postBody) => {
            expect(postBody).not.to.be.null;
            const requests = JSON.parse(postBody);

            expect(requests[0].user.browser_id).to.be.eq(
              "00000000-0000-0000-0000-000000000000"
            );

            return new Promise((resolve) => {
              resolve({
                statusCode: 202,
                body: undefined,
                headers: [],
              });
            });
          };
        } else if (packageName === "setCookie") {
          return (name, value) => {
            expect(name).to.be.eq("__lt__cid");
            expect(value).to.be.eq("00000000-0000-0000-0000-000000000000");
          };
        }
        return requireFunctionBase[packageName];
      }
    );

    successAssertion.once();
    failureAssertion.never();
  });

  it("should fail that this tag template sends a event if the LINE Conversion API returns response with 400 bad request", async () => {
    const successAssertion = getCallAssertion();
    const failureAssertion = getCallAssertion();
    await template(
      {
        event: "page_view",
        lineTagId: "00000000-0000-0000-0000-000000000000",
        eventName: undefined,
        lineAccessToken: "dummyAccessToken",
        lineChannelId: undefined,
        enableCookie: true,
        testFlag: false,
        gtmOnSuccess: () => {
          successAssertion.call();
        },
        gtmOnFailure: () => {
          failureAssertion.call();
        },
      },
      (packageName) => {
        if (packageName === "sendHttpRequest") {
          return () => {
            return new Promise((resolve) => {
              resolve({
                statusCode: 400,
                body: undefined,
                headers: [],
              });
            });
          };
        }
        return requireFunctionBase[packageName];
      }
    );

    successAssertion.never();
    failureAssertion.once();
  });

  it("should succeed that this tag template sends custom conversion event if the LINE Conversion API returns response with 202 accepted status", async () => {
    const successAssertion = getCallAssertion();
    const failureAssertion = getCallAssertion();
    await template(
      {
        event: "conversion",
        lineTagId: "00000000-0000-0000-0000-000000000000",
        eventName: undefined,
        lineAccessToken: "dummyAccessToken",
        lineChannelId: undefined,
        enableCookie: true,
        testFlag: false,
        gtmOnSuccess: () => {
          successAssertion.call();
        },
        gtmOnFailure: () => {
          failureAssertion.call();
        },
      },
      (packageName) => {
        if (packageName === "getAllEventData") {
          return () => {
            const base = requireFunctionBase[packageName]();
            base.event_name = "Purchase";
            return base;
          };
        } else if (packageName === "sendHttpRequest") {
          return (url, options, postBody) => {
            const requests = JSON.parse(postBody);

            expect(requests[0].event.source_type).to.be.eq("web");
            expect(requests[0].event.event_type).to.be.eq("conversion");
            expect(requests[0].event.event_name).to.be.eq("Purchase");

            return new Promise((resolve) => {
              resolve({
                statusCode: 202,
                body: undefined,
                headers: [],
              });
            });
          };
        }
        return requireFunctionBase[packageName];
      }
    );

    successAssertion.once();
    failureAssertion.never();
  });

  it("shouldn't set any cookies if enableCookie is false", async () => {
    const successAssertion = getCallAssertion();
    const failureAssertion = getCallAssertion();
    const cookieBakeAssertion = getCallAssertion();
    await template(
      {
        event: "conversion",
        lineTagId: "00000000-0000-0000-0000-000000000000",
        eventName: undefined,
        lineAccessToken: "dummyAccessToken",
        lineChannelId: undefined,
        enableCookie: false,
        testFlag: false,
        gtmOnSuccess: () => {
          successAssertion.call();
        },
        gtmOnFailure: () => {
          failureAssertion.call();
        },
      },
      (packageName) => {
        if (packageName === "setCookie") {
          return () => {
            cookieBakeAssertion.call();
          };
        }
        return requireFunctionBase[packageName];
      }
    );

    successAssertion.once();
    failureAssertion.never();
    cookieBakeAssertion.never();
  });

  it("should fail if the LINE Conversion API returns response with 500 internal error.", async () => {
    const successAssertion = getCallAssertion();
    const failureAssertion = getCallAssertion();
    await template(
      {
        event: "page_view",
        lineTagId: "00000000-0000-0000-0000-000000000000",
        eventName: undefined,
        lineAccessToken: "dummyAccessToken",
        lineChannelId: undefined,
        enableCookie: true,
        testFlag: false,
        gtmOnSuccess: () => {
          successAssertion.call();
        },
        gtmOnFailure: () => {
          failureAssertion.call();
        },
      },
      (packageName) => {
        if (packageName === "sendHttpRequest") {
          return () => {
            return new Promise((resolve) => {
              resolve({
                statusCode: 500,
                body: undefined,
                headers: [],
              });
            });
          };
        }
        return requireFunctionBase[packageName];
      }
    );

    successAssertion.never();
    failureAssertion.once();
  });

  it("can also send value and currency when sending Standard Event", async () => {
    const successAssertion = getCallAssertion();
    const failureAssertion = getCallAssertion();
    await template(
      {
        event: "conversion",
        lineTagId: "00000000-0000-0000-0000-000000000000",
        lineAccessToken: "dummyAccessToken",
        lineChannelId: undefined,
        enableCookie: true,
        testFlag: false,
        gtmOnSuccess: () => {
          successAssertion.call();
        },
        gtmOnFailure: () => {
          failureAssertion.call();
        },
      },
      (packageName) => {
        if (packageName === "getAllEventData") {
          return () => {
            const base = requireFunctionBase[packageName]();
            base.event_name = "Purchase";
            base["x-line-event-value"] = 1000;
            base["x-line-event-currency"] = "JPY";
            return base;
          };
        } else if (packageName === "sendHttpRequest") {
          return (url, options, postBody) => {
            expect(postBody).not.to.be.null;
            const requests = JSON.parse(postBody);

            expect(url).to.be.eq(
              "https://conversion-api.tr.line.me/v1/00000000-0000-0000-0000-000000000000/events"
            );

            expect(options.method).to.be.eq("POST");
            expect(options.headers["X-Line-TagAccessToken"]).to.be.eq(
              "dummyAccessToken"
            );
            expect(options.headers["X-Line-ChannelID"]).to.be.undefined;

            expect(requests).length(1);
            expect(requests[0].event.source_type).to.be.eq("web");
            expect(requests[0].event.event_type).to.be.eq("conversion");
            expect(requests[0].event.event_name).to.be.eq("Purchase");

            expect(requests[0].custom.value).to.be.eq(1000);
            expect(requests[0].custom.currency).to.be.eq("JPY");

            return new Promise((resolve) => {
              resolve({
                statusCode: 202,
                body: undefined,
                headers: [],
              });
            });
          };
        }
        return requireFunctionBase[packageName];
      }
    );

    successAssertion.once();
    failureAssertion.never();
  });

  it("should succeed that test_flag is set to true", async () => {
    const successAssertion = getCallAssertion();
    const failureAssertion = getCallAssertion();
    const cookieBakeAssertion = getCallAssertion();
    await template(
      {
        event: "conversion",
        lineTagId: "00000000-0000-0000-0000-000000000000",
        eventName: undefined,
        lineAccessToken: "dummyAccessToken",
        lineChannelId: undefined,
        enableCookie: true,
        testFlag: true,
        gtmOnSuccess: () => {
          successAssertion.call();
        },
        gtmOnFailure: () => {
          failureAssertion.call();
        },
      },
      (packageName) => {
        if (packageName === "sendHttpRequest") {
          return (url, options, postBody) => {
            expect(postBody).not.to.be.null;
            const requests = JSON.parse(postBody);

            expect(url).to.be.eq(
              "https://conversion-api.tr.line.me/v1/00000000-0000-0000-0000-000000000000/events"
            );

            expect(options.method).to.be.eq("POST");
            expect(options.headers["X-Line-TagAccessToken"]).to.be.eq(
              "dummyAccessToken"
            );

            expect(requests).length(1);
            expect(requests[0].event.source_type).to.be.eq("web");
            expect(requests[0].event.event_type).to.be.eq("conversion");
            expect(requests[0].event.event_name).to.be.eq("Conversion");
            expect(requests[0].event.test_flag).to.be.true;

            return new Promise((resolve) => {
              resolve({
                statusCode: 202,
                body: undefined,
                headers: [],
              });
            });
          };
        }
        return requireFunctionBase[packageName];
      }
    );

    successAssertion.once();
    failureAssertion.never();
    cookieBakeAssertion.never();
  });
});
