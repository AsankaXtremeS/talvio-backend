FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate      # <-- generates @prisma/client so tsc can compile
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate      # <-- runtime needs the client too
COPY --from=builder /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/server.js"]