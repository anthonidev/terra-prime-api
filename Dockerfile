# Etapa base
FROM node:20-slim AS base

# Instalar pnpm directamente en lugar de usar corepack
RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Etapa de construcción
FROM base AS builder
WORKDIR /app
COPY . .
# Asegúrate de copiar los archivos de contexto
COPY src/chatbot/context ./src/chatbot/context
RUN pnpm build

# Etapa de producción
FROM node:20-slim AS runner

# Instalar pnpm directamente en lugar de usar corepack
RUN npm install -g pnpm

WORKDIR /usr/src/app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
# Copia los archivos de contexto a la misma ruta en producción
COPY --from=builder /app/src/chatbot/context ./src/chatbot/context

# Configurar puerto para Railway (opcional pero recomendado)
ENV PORT=3000
EXPOSE 3000

CMD [ "node", "dist/main" ]