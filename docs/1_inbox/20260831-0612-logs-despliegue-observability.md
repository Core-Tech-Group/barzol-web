
2026-08-30 22:48:45.400
PET
error
GET https://barzol-web.barzolweb3d.workers.dev/

{
  "level": "error",
  "message": "GET https://barzol-web.barzolweb3d.workers.dev/",
  "$workers": {
    "truncated": false,
    "event": {
      "request": {
        "cf": {
          "isEUCountry": false,
          "tlsClientAuth": {
            "certRFC9440TooLarge": false,
            "certChainRFC9440TooLarge": false,
            "certPresented": "0",
            "certVerified": "NONE",
            "certRevoked": "0",
            "certIssuerDN": "",
            "certSubjectDN": "",
            "certIssuerDNRFC2253": "",
            "certSubjectDNRFC2253": "",
            "certIssuerDNLegacy": "",
            "certSubjectDNLegacy": "",
            "certSerial": "",
            "certIssuerSerial": "",
            "certSKI": "",
            "certIssuerSKI": "",
            "certFingerprintSHA1": "",
            "certFingerprintSHA256": "",
            "certNotBefore": "",
            "certNotAfter": "",
            "certRFC9440": "",
            "certChainRFC9440": ""
          },
          "httpProtocol": "HTTP/3",
          "clientAcceptEncoding": "gzip, deflate, br",
          "requestPriority": "",
          "colo": "EZE",
          "asOrganization": "DESARROLLO DE INFRAESTRUCTURA DE TELECOMUNICACIONES PERU S.A.C. (INFRATEL)",
          "country": "PE",
          "city": "Ayacucho",
          "continent": "SA",
          "region": "Ayacucho",
          "regionCode": "AYA",
          "timezone": "America/Lima",
          "longitude": "-74.22345",
          "latitude": "-13.1638",
          "postalCode": "05001",
          "tlsVersion": "TLSv1.3",
          "tlsCipher": "AEAD-AES128-GCM-SHA256",
          "tlsClientRandom": "ny7plcmJx/oVAYmMrqrax0W1zp3RiGsGSdw4sfPrrko=",
          "tlsClientCiphersSha1": "3HTt3+R/6BL3zeALJDSq0pR1yOQ=",
          "tlsClientExtensionsSha1": "VvUOROEJjvU2eap8VH26Uxu41Xk=",
          "tlsClientExtensionsSha1Le": "CVnoM7g5SalMjwZwnjmF+tYhRkQ=",
          "tlsClientHelloLength": "1755",
          "verifiedBotCategory": "",
          "edgeRequestKeepAliveStatus": 1,
          "clientTcpRtt": 0,
          "clientQuicRtt": 143,
          "asn": 270068,
          "edgeL4": {
            "deliveryRate": 10237
          }
        },
        "headers": {
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-encoding": "gzip, br",
          "accept-language": "es-419,es;q=0.9",
          "cf-connecting-ip": "2803:a3e0:141:e880:9402:ff6b:f89a:c6c4",
          "cf-ipcountry": "PE",
          "cf-ray": "a3390fb6a9de8bc1",
          "cf-visitor": "{\"scheme\":\"https\"}",
          "connection": "Keep-Alive",
          "host": "barzol-web.barzolweb3d.workers.dev",
          "priority": "u=0, i",
          "sec-ch-ua": "\"Chromium\";v=\"151\", \"Not=A?Brand\";v=\"99\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Windows\"",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "cross-site",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
          "x-forwarded-proto": "https",
          "x-real-ip": "2803:a3e0:141:e880:9402:ff6b:f89a:c6c4"
        },
        "method": "GET",
        "url": "https://barzol-web.barzolweb3d.workers.dev/"
      },
      "path": "/",
      "response": {
        "status": 500
      }
    },
    "scriptName": "barzol-web",
    "scriptVersion": {
      "id": "4b41a623-7d97-4d9c-9918-cd270ca3a8ce"
    },
    "eventType": "fetch",
    "executionModel": "stateless",
    "requestId": "1de6f9fcadc8dfba38b8c2b3e7942263",
    "traceId": "bf41e7fc5f3957e402df9290ffa18115",
    "outcome": "ok",
    "wallTimeMs": 70,
    "cpuTimeMs": 29
  },
  "$metadata": {
    "id": "01M1AYY3PR0000000000000007",
    "requestId": "1de6f9fcadc8dfba38b8c2b3e7942263",
    "rayId": "a3390fb6a9de8bc1",
    "traceId": "bf41e7fc5f3957e402df9290ffa18115",
    "trigger": "GET /",
    "service": "barzol-web",
    "level": "error",
    "error": "GET https://barzol-web.barzolweb3d.workers.dev/",
    "message": "GET https://barzol-web.barzolweb3d.workers.dev/",
    "account": "dca3d80d6a3bd638af80361491d887a1",
    "type": "cf-worker-event",
    "fingerprint": "\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
    "origin": "fetch"
  }
}

2026-08-30 22:48:45.400
PET
error
03:48:45 [ERROR] Invalid API key

{
  "level": "error",
  "message": "03:48:45 [ERROR] Invalid API key",
  "$workers": {
    "truncated": false,
    "scriptName": "barzol-web",
    "scriptVersion": {
      "id": "4b41a623-7d97-4d9c-9918-cd270ca3a8ce"
    },
    "eventType": "fetch",
    "executionModel": "stateless",
    "requestId": "1de6f9fcadc8dfba38b8c2b3e7942263",
    "event": {
      "request": {
        "method": "GET",
        "url": "https://barzol-web.barzolweb3d.workers.dev/",
        "path": "/"
      }
    },
    "traceId": "bf41e7fc5f3957e402df9290ffa18115",
    "spanId": "eddd8fead9cac588"
  },
  "$metadata": {
    "id": "01M1AYY3PR0000000000000005",
    "requestId": "1de6f9fcadc8dfba38b8c2b3e7942263",
    "rayId": "a3390fb6a9de8bc1",
    "traceId": "bf41e7fc5f3957e402df9290ffa18115",
    "spanId": "eddd8fead9cac588",
    "trigger": "GET /",
    "service": "barzol-web",
    "level": "error",
    "error": "03:48:45 [ERROR] Invalid API key",
    "message": "03:48:45 [ERROR] Invalid API key",
    "account": "dca3d80d6a3bd638af80361491d887a1",
    "type": "cf-worker",
    "fingerprint": "\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
    "origin": "fetch"
  }
}

2026-08-30 22:48:45.400
PET
error

{
  "level": "error",
  "nivel": "error",
  "contexto": "middleware",
  "ruta": "/",
  "metodo": "GET",
  "error": "object",
  "mensaje": "[object Object]",
  "$workers": {
    "truncated": false,
    "scriptName": "barzol-web",
    "scriptVersion": {
      "id": "4b41a623-7d97-4d9c-9918-cd270ca3a8ce"
    },
    "eventType": "fetch",
    "executionModel": "stateless",
    "requestId": "1de6f9fcadc8dfba38b8c2b3e7942263",
    "event": {
      "request": {
        "method": "GET",
        "url": "https://barzol-web.barzolweb3d.workers.dev/",
        "path": "/"
      }
    },
    "traceId": "bf41e7fc5f3957e402df9290ffa18115",
    "spanId": "eddd8fead9cac588"
  },
  "$metadata": {
    "id": "01M1AYY3PR0000000000000004",
    "requestId": "1de6f9fcadc8dfba38b8c2b3e7942263",
    "rayId": "a3390fb6a9de8bc1",
    "traceId": "bf41e7fc5f3957e402df9290ffa18115",
    "spanId": "eddd8fead9cac588",
    "trigger": "GET /",
    "service": "barzol-web",
    "level": "error",
    "error": "object",
    "account": "dca3d80d6a3bd638af80361491d887a1",
    "type": "cf-worker",
    "fingerprint": "\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
    "origin": "fetch"
  }
}

2026-08-30 22:43:01.399
PET
error
GET https://barzol-web.barzolweb3d.workers.dev/

{
  "level": "error",
  "message": "GET https://barzol-web.barzolweb3d.workers.dev/",
  "$workers": {
    "truncated": false,
    "event": {
      "request": {
        "cf": {
          "isEUCountry": false,
          "tlsClientAuth": {
            "certRFC9440TooLarge": false,
            "certChainRFC9440TooLarge": false,
            "certPresented": "0",
            "certVerified": "NONE",
            "certRevoked": "0",
            "certIssuerDN": "",
            "certSubjectDN": "",
            "certIssuerDNRFC2253": "",
            "certSubjectDNRFC2253": "",
            "certIssuerDNLegacy": "",
            "certSubjectDNLegacy": "",
            "certSerial": "",
            "certIssuerSerial": "",
            "certSKI": "",
            "certIssuerSKI": "",
            "certFingerprintSHA1": "",
            "certFingerprintSHA256": "",
            "certNotBefore": "",
            "certNotAfter": "",
            "certRFC9440": "",
            "certChainRFC9440": ""
          },
          "httpProtocol": "HTTP/3",
          "clientAcceptEncoding": "gzip, deflate, br",
          "requestPriority": "",
          "colo": "EZE",
          "asOrganization": "DESARROLLO DE INFRAESTRUCTURA DE TELECOMUNICACIONES PERU S.A.C. (INFRATEL)",
          "country": "PE",
          "city": "Ayacucho",
          "continent": "SA",
          "region": "Ayacucho",
          "regionCode": "AYA",
          "timezone": "America/Lima",
          "longitude": "-74.22345",
          "latitude": "-13.1638",
          "postalCode": "05001",
          "tlsVersion": "TLSv1.3",
          "tlsCipher": "AEAD-AES128-GCM-SHA256",
          "tlsClientRandom": "vAUb2FxpDpwJ/IQgPDpcsHTjbmoKiftm2kgs5lGVS4o=",
          "tlsClientCiphersSha1": "3HTt3+R/6BL3zeALJDSq0pR1yOQ=",
          "tlsClientExtensionsSha1": "7FW2jzkRGS74bB2SHRIthwVdhtI=",
          "tlsClientExtensionsSha1Le": "A0Qoe96VgBTv8FQx0rgpq11W3Sk=",
          "tlsClientHelloLength": "1519",
          "verifiedBotCategory": "",
          "edgeRequestKeepAliveStatus": 1,
          "clientTcpRtt": 0,
          "clientQuicRtt": 142,
          "asn": 270068,
          "edgeL4": {
            "deliveryRate": 23534
          }
        },
        "headers": {
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-encoding": "gzip, br",
          "accept-language": "es-419,es;q=0.9",
          "cf-connecting-ip": "2803:a3e0:141:e880:9402:ff6b:f89a:c6c4",
          "cf-ipcountry": "PE",
          "cf-ray": "a33907511d89acbc",
          "cf-visitor": "{\"scheme\":\"https\"}",
          "connection": "Keep-Alive",
          "host": "barzol-web.barzolweb3d.workers.dev",
          "priority": "u=0, i",
          "sec-ch-ua": "\"Chromium\";v=\"151\", \"Not=A?Brand\";v=\"99\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Windows\"",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "cross-site",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
          "x-forwarded-proto": "https",
          "x-real-ip": "2803:a3e0:141:e880:9402:ff6b:f89a:c6c4"
        },
        "method": "GET",
        "url": "https://barzol-web.barzolweb3d.workers.dev/"
      },
      "path": "/",
      "response": {
        "status": 500
      }
    },
    "scriptName": "barzol-web",
    "scriptVersion": {
      "id": "7ae94d9a-dfaf-4bad-877f-93aa35abb96e"
    },
    "eventType": "fetch",
    "executionModel": "stateless",
    "requestId": "c52430d12548b7af3afd85aa7e1025f3",
    "traceId": "35d2d5affe48fa0d76cdaf19a40ae9fc",
    "outcome": "ok",
    "wallTimeMs": 12,
    "cpuTimeMs": 10
  },
  "$metadata": {
    "id": "01M1AYKKRQ0000000000000004",
    "requestId": "c52430d12548b7af3afd85aa7e1025f3",
    "rayId": "a33907511d89acbc",
    "traceId": "35d2d5affe48fa0d76cdaf19a40ae9fc",
    "trigger": "GET /",
    "service": "barzol-web",
    "level": "error",
    "error": "GET https://barzol-web.barzolweb3d.workers.dev/",
    "message": "GET https://barzol-web.barzolweb3d.workers.dev/",
    "account": "dca3d80d6a3bd638af80361491d887a1",
    "type": "cf-worker-event",
    "fingerprint": "\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
    "origin": "fetch"
  }
}

2026-08-30 22:43:01.399
PET
error



03:43:01 [ERROR] MissingEnvError: Faltan variables de entorno: BARZOL_SUPABASE_ANON_KEY. En local se declaran en `.env` (copiá `.env.example`); en producción, en Cloudflare → Workers & Pages → barzol-web → Settings → Variables and Secrets. at requireServerEnv (chunks/serverEnv_DLYF-3zT.mjs:109:34) at getSupabase (chunks/client_BxsrGq1r.mjs:9:14) at getHomeItems (chunks/homeService_sxIrA5Oc.mjs:129:32) at chunks/index_Dra72gAT.mjs:23:33 at AstroComponentInstance.HomeView [as factory] (chunks/compiler_B94aeFcU.mjs:18:10) at AstroComponentInstance.init (chunks/server_C7_kfgQw.mjs:1706:27) at collectPropagatedHeadParts (chunks/server_C7_kfgQw.mjs:550:40) at async bufferPropagatedHead (chunks/server_C7_kfgQw.mjs:580:20) at async bufferHeadContent (chunks/server_C7_kfgQw.mjs:2095:2) at async renderStreamToStream (chunks/server_C7_kfgQw.mjs:1955:14)

{
  "level": "error",
  "message": "03:43:01 [ERROR] MissingEnvError: Faltan variables de entorno: BARZOL_SUPABASE_ANON_KEY. En local se declaran en `.env` (copiá `.env.example`); en producción, en Cloudflare → Workers & Pages → barzol-web → Settings → Variables and Secrets.\n    at requireServerEnv (chunks/serverEnv_DLYF-3zT.mjs:109:34)\n    at getSupabase (chunks/client_BxsrGq1r.mjs:9:14)\n    at getHomeItems (chunks/homeService_sxIrA5Oc.mjs:129:32)\n    at chunks/index_Dra72gAT.mjs:23:33\n    at AstroComponentInstance.HomeView [as factory] (chunks/compiler_B94aeFcU.mjs:18:10)\n    at AstroComponentInstance.init (chunks/server_C7_kfgQw.mjs:1706:27)\n    at collectPropagatedHeadParts (chunks/server_C7_kfgQw.mjs:550:40)\n    at async bufferPropagatedHead (chunks/server_C7_kfgQw.mjs:580:20)\n    at async bufferHeadContent (chunks/server_C7_kfgQw.mjs:2095:2)\n    at async renderStreamToStream (chunks/server_C7_kfgQw.mjs:1955:14)",
  "$workers": {
    "truncated": false,
    "scriptName": "barzol-web",
    "scriptVersion": {
      "id": "7ae94d9a-dfaf-4bad-877f-93aa35abb96e"
    },
    "eventType": "fetch",
    "executionModel": "stateless",
    "requestId": "c52430d12548b7af3afd85aa7e1025f3",
    "event": {
      "request": {
        "method": "GET",
        "url": "https://barzol-web.barzolweb3d.workers.dev/",
        "path": "/"
      }
    },
    "traceId": "35d2d5affe48fa0d76cdaf19a40ae9fc",
    "spanId": "845adf9065497aaa"
  },
  "$metadata": {
    "id": "01M1AYKKRQ0000000000000002",
    "requestId": "c52430d12548b7af3afd85aa7e1025f3",
    "rayId": "a33907511d89acbc",
    "traceId": "35d2d5affe48fa0d76cdaf19a40ae9fc",
    "spanId": "845adf9065497aaa",
    "trigger": "GET /",
    "service": "barzol-web",
    "level": "error",
    "error": "03:43:01 [ERROR] MissingEnvError: Faltan variables de entorno: BARZOL_SUPABASE_ANON_KEY. En local se declaran en `.env` (copiá `.env.example`); en producción, en Cloudflare → Workers & Pages → barzol-web → Settings → Variables and Secrets.\n    at requireServerEnv (chunks/serverEnv_DLYF-3zT.mjs:109:34)\n    at getSupabase (chunks/client_BxsrGq1r.mjs:9:14)\n    at getHomeItems (chunks/homeService_sxIrA5Oc.mjs:129:32)\n    at chunks/index_Dra72gAT.mjs:23:33\n    at AstroComponentInstance.HomeView [as factory] (chunks/compiler_B94aeFcU.mjs:18:10)\n    at AstroComponentInstance.init (chunks/server_C7_kfgQw.mjs:1706:27)\n    at collectPropagatedHeadParts (chunks/server_C7_kfgQw.mjs:550:40)\n    at async bufferPropagatedHead (chunks/server_C7_kfgQw.mjs:580:20)\n    at async bufferHeadContent (chunks/server_C7_kfgQw.mjs:2095:2)\n    at async renderStreamToStream (chunks/server_C7_kfgQw.mjs:1955:14)",
    "message": "03:43:01 [ERROR] MissingEnvError: Faltan variables de entorno: BARZOL_SUPABASE_ANON_KEY. En local se declaran en `.env` (copiá `.env.example`); en producción, en Cloudflare → Workers & Pages → barzol-web → Settings → Variables and Secrets.\n    at requireServerEnv (chunks/serverEnv_DLYF-3zT.mjs:109:34)\n    at getSupabase (chunks/client_BxsrGq1r.mjs:9:14)\n    at getHomeItems (chunks/homeService_sxIrA5Oc.mjs:129:32)\n    at chunks/index_Dra72gAT.mjs:23:33\n    at AstroComponentInstance.HomeView [as factory] (chunks/compiler_B94aeFcU.mjs:18:10)\n    at AstroComponentInstance.init (chunks/server_C7_kfgQw.mjs:1706:27)\n    at collectPropagatedHeadParts (chunks/server_C7_kfgQw.mjs:550:40)\n    at async bufferPropagatedHead (chunks/server_C7_kfgQw.mjs:580:20)\n    at async bufferHeadContent (chunks/server_C7_kfgQw.mjs:2095:2)\n    at async renderStreamToStream (chunks/server_C7_kfgQw.mjs:1955:14)",
    "account": "dca3d80d6a3bd638af80361491d887a1",
    "type": "cf-worker",
    "fingerprint": "\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
    "origin": "fetch"
  }
}

2026-08-30 22:43:01.399
PET
error


{
  "level": "error",
  "nivel": "error",
  "contexto": "middleware",
  "ruta": "/",
  "metodo": "GET",
  "error": "MissingEnvError",
  "mensaje": "Faltan variables de entorno: BARZOL_SUPABASE_ANON_KEY. En local se declaran en `.env` (copiá `.env.example`); en producción, en Cloudflare → Workers & Pages → barzol-web → Settings → Variables and Secrets.",
  "stack": "MissingEnvError: Faltan variables de entorno: BARZOL_SUPABASE_ANON_KEY. En local se declaran en `.env` (copiá `.env.example`); en producción, en Cloudflare → Workers & Pages → barzol-web → Settings → Variables and Secrets.\n    at requireServerEnv (chunks/serverEnv_DLYF-3zT.mjs:109:34)\n    at getSupabase (chunks/client_BxsrGq1r.mjs:9:14)\n    at getHomeItems (chunks/homeService_sxIrA5Oc.mjs:129:32)\n    at chunks/index_Dra72gAT.mjs:23:33\n    at AstroComponentInstance.HomeView [as factory] (chunks/compiler_B94aeFcU.mjs:18:10)\n    at AstroComponentInstance.init (chunks/server_C7_kfgQw.mjs:1706:27)\n    at collectPropagatedHeadParts (chunks/server_C7_kfgQw.mjs:550:40)\n    at async bufferPropagatedHead (chunks/server_C7_kfgQw.mjs:580:20)\n    at async bufferHeadContent (chunks/server_C7_kfgQw.mjs:2095:2)\n    at async renderStreamToStream (chunks/server_C7_kfgQw.mjs:1955:14)",
  "$workers": {
    "truncated": false,
    "scriptName": "barzol-web",
    "scriptVersion": {
      "id": "7ae94d9a-dfaf-4bad-877f-93aa35abb96e"
    },
    "eventType": "fetch",
    "executionModel": "stateless",
    "requestId": "c52430d12548b7af3afd85aa7e1025f3",
    "event": {
      "request": {
        "method": "GET",
        "url": "https://barzol-web.barzolweb3d.workers.dev/",
        "path": "/"
      }
    },
    "traceId": "35d2d5affe48fa0d76cdaf19a40ae9fc",
    "spanId": "845adf9065497aaa"
  },
  "$metadata": {
    "id": "01M1AYKKRQ0000000000000001",
    "requestId": "c52430d12548b7af3afd85aa7e1025f3",
    "rayId": "a33907511d89acbc",
    "traceId": "35d2d5affe48fa0d76cdaf19a40ae9fc",
    "spanId": "845adf9065497aaa",
    "trigger": "GET /",
    "service": "barzol-web",
    "level": "error",
    "error": "MissingEnvError",
    "account": "dca3d80d6a3bd638af80361491d887a1",
    "type": "cf-worker",
    "fingerprint": "\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
    "origin": "fetch"
  }
}