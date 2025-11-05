FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci  # Install ALL dependencies (including devDependencies)

COPY . .

RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production  # Now install only production deps

COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/server.js"]
