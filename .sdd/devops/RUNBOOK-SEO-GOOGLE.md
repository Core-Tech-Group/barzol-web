# Puesta en marcha y diagnóstico de Google Search · barzol3d.com

**Fecha de auditoría:** 21-09-2026
**Contrato de código:** [SPEC-006](../specs/SPEC-006-seo-esencial.md), [PLAN](../plans/SPEC-006.plan.md)
**Seguimiento:** [BZ-110/116/118](../../docs/2_backlog/20260920-1837-kanban-propuesta-tecnica-implementacion-SEO-ranking.md)

## Línea de base comprobada

- `https://barzol3d.com/`, `/robots.txt` y `/sitemap.xml`: HTTP 200.
- Sitemap: 40 URLs únicas. La portada, catálogo, galería y página «Nosotros» entregan HTML con canónica HTTPS, sin `noindex` ni cabecera `X-Robots-Tag`.
- El `robots.txt` del Worker permite `/` y declara `Sitemap: https://barzol3d.com/sitemap.xml`. No necesita habilitarse en Cloudflare. Una política gestionada de Cloudflare, si se activa, puede anteponer reglas; verificar siempre la respuesta pública final.
- `http://barzol3d.com/` entrega 200 y no redirige. Los DNS NS son de Cloudflare. El TXT `google-site-verification` añadido por el titular ya responde desde el resolvedor local y `1.1.1.1`; su valor coincide con el entregado en la conversación. Esto confirma publicación DNS, no la aprobación de la propiedad dentro de Search Console.
- Una solicitud que declara `User-Agent: Googlebot` recibió 200. Esto no prueba que el Googlebot real pueda pasar reglas WAF o que Google haya indexado la URL.

## Acciones en las cuentas del dominio

1. En Cloudflare, abrir **SSL/TLS → Edge Certificates → Always Use HTTPS** y activarlo. Comprobar que `http://barzol3d.com/` devuelve 301/308 hacia `https://barzol3d.com/`, sin bucle. La configuración vive en el panel de la zona, no en `wrangler.jsonc`.
2. En la propiedad de dominio `barzol3d.com` ya creada en [Search Console](https://search.google.com/search-console/welcome), pulsar **Verificar**. El TXT está publicado y coincide; conservarlo en Cloudflare después de verificar. Si Google aún no lo encuentra, esperar propagación y reintentar sin crear registros duplicados.
3. En **Search Console → Sitemaps**, enviar `https://barzol3d.com/sitemap.xml` y anotar si Google lo lee y cuántas URLs descubre. El sitemap ya anunciado en `robots.txt` no aparecerá necesariamente en este informe hasta que se envíe desde la propiedad.
4. En **Inspección de URL**, introducir `https://barzol3d.com/`. Guardar el estado indexado, motivo de exclusión si existe, canónica elegida por Google, fecha de último rastreo y resultado de **Probar URL publicada**. Si la prueba permite indexación, pulsar **Solicitar indexación** una vez. Inspeccionar también una URL de producto del sitemap.
5. Si Google indica que no puede rastrear, mirar **Cloudflare → Security → Analytics → Events** para solicitudes verificadas de Googlebot y su acción. Corregir solo la regla que realmente bloquea o desafía; usar la clasificación de bot verificado (`cf.client.bot`) cuando corresponda, nunca confiar únicamente en el texto `User-Agent`.
6. Revisar **Search Console → Indexación → Páginas** y registrar el motivo específico de cualquier URL excluida. Repetir la inspección tras los días de rastreo; publicar el resultado real en el tablero. El envío de sitemap o la solicitud de indexación no garantizan aparición ni posición.

## Criterio de cierre

Registrar en BZ-110/116/118: propiedad verificada, fecha y resultado del sitemap, captura o texto del estado de Inspección de URL, estado de seguridad de Cloudflare si hubo bloqueo, respuesta de la redirección HTTP y fecha de la primera impresión o aparición en Google. Sin propiedad verificada solo se puede afirmar que el sitio es técnicamente accesible desde pruebas públicas.

## Fuentes oficiales

- [Requisitos técnicos de Google Search](https://developers.google.com/search/docs/essentials/technical)
- [Verificar propiedad por DNS](https://support.google.com/webmasters/answer/9008080)
- [Informe de sitemaps](https://support.google.com/webmasters/answer/7451001)
- [Inspección de URL](https://support.google.com/webmasters/answer/9012289)
- [Plazos y límites de solicitud de rastreo](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)
- [Cloudflare Always Use HTTPS](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/)
- [Cloudflare robots.txt gestionado](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/)
- [Permitir bots verificados en reglas WAF](https://developers.cloudflare.com/waf/custom-rules/use-cases/allow-traffic-from-verified-bots/)
