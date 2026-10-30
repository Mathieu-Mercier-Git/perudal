// node-fetch v3 est un module ESM pur, non chargeable par Jest (CommonJS).
// fetch-mock fait require('node-fetch') : on le redirige vers le fetch natif de Node 18,
// exposé dans l'environnement par tests/jsdomEnvironment.js.
const nodeFetch = (...args) => globalThis.fetch(...args);
nodeFetch.default = nodeFetch;
nodeFetch.Headers = globalThis.Headers;
nodeFetch.Request = globalThis.Request;
nodeFetch.Response = globalThis.Response;

module.exports = nodeFetch;
