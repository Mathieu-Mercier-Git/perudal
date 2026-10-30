// jsdom environment exposing Node 18 web APIs that jsdom does not provide
// (TextEncoder/TextDecoder required by react-dom/server, fetch & co used by the HTTP clients / fetch-mock).
const JSDOMEnvironment = require('jest-environment-jsdom').default;

class JsdomWithNodeGlobalsEnvironment extends JSDOMEnvironment {
  constructor(...args) {
    super(...args);
    this.global.TextEncoder = TextEncoder;
    this.global.TextDecoder = TextDecoder;
    this.global.fetch = fetch;
    this.global.Headers = Headers;
    this.global.Request = Request;
    this.global.Response = Response;
  }
}

module.exports = JsdomWithNodeGlobalsEnvironment;
