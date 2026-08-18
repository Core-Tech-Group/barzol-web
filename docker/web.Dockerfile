# Sitio Astro compilado para Node, no para workerd.
#
# El build va DENTRO del contenedor a propósito: la Orange Pi tiene Node
# v18.19.1 y `package.json` exige >=22.12.0. Compilar en el anfitrión sería
# empezar por romper la única versión que el proyecto declara soportar.
#
# `DEPLOY_TARGET=node` es lo único que cambia respecto del build de producción:
# `astro.config.mjs` resuelve con eso el adaptador y los dos módulos que
# dependen del runtime (ver ficha OP-04 del kanban de despliegue local).

# ─── Etapa de compilación ────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# El manifiesto primero: mientras las dependencias no cambien, esta capa se
# reutiliza y un rebuild de código no vuelve a bajar el árbol entero — que en
# esta máquina son varios minutos.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ENV DEPLOY_TARGET=node
RUN npm run build

# Las dependencias de desarrollo (typescript, @astrojs/check, @types/*) no
# hacen falta para servir, y el disco de esta máquina está al 91%. Se podan acá
# para copiar a la etapa final un node_modules ya limpio, en vez de reinstalar
# desde cero — que costaría los mismos minutos otra vez.
RUN npm prune --omit=dev

# ─── Etapa de ejecución ──────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

# El directorio de multimedia se crea acá, con dueño `node`, y no en compose:
# Docker inicializa un volumen con nombre vacío copiando el contenido Y LOS
# PERMISOS de la ruta de la imagen. Creándolo así, el volumen nace escribible
# por el usuario sin privilegios; montándolo a secas, nacería de root y la
# primera subida del panel fallaría con EACCES.
RUN mkdir -p /data/media && chown -R node:node /data

# El proceso corre sin privilegios.
USER node

EXPOSE 4321

# El adaptador de Node en modo `standalone` trae su propio servidor HTTP: no
# hace falta envolverlo en Express ni en un gestor de procesos — de reiniciarlo
# se encarga la política `restart` de compose.
CMD ["node", "dist/server/entry.mjs"]
