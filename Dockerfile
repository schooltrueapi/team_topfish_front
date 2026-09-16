# ====================
# Этап 1: Сборка
# ====================
FROM node:20-alpine AS builder

WORKDIR /app

# Копирование манифестов зависимостей
COPY package*.json ./

# Установка зависимостей
RUN npm ci

# Копирование всех исходников
COPY . .

# Аргумент сборки для адреса API бэкенда (вшивается в Next.js во время next build)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Отключение телеметрии Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# Создание папки public, если ее нет, чтобы не падало копирование
RUN mkdir -p public

# Сборка Next.js приложения
RUN npm run build

# ====================
# Этап 2: Production образ
# ====================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Копирование собранных файлов и зависимостей
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "start"]
