// Contrato de lectura de multimedia, compartido por los dos drivers.
//
// Vive en su propio archivo y no dentro de uno de ellos porque los dos lo
// implementan y ninguno debe importar al otro: `mediaDriver.cloudflare.ts`
// arrastra `cloudflare:workers` y `mediaDriver.node.ts` arrastra `node:fs`, así
// que cruzarlos rompería el build del objetivo contrario.

export interface MediaLeida {
  /** Bytes del archivo. Va como stream: un video no entra cómodo en memoria. */
  cuerpo: ReadableStream<Uint8Array>;
  /** Tamaño en bytes, para poder responder `Content-Length`. */
  tamano: number;
}
