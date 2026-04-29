FROM node:20-alpine AS build

RUN apk add --no-cache openssl

WORKDIR /app

# Copy prisma schema and seed from project root
COPY prisma ./prisma

# Copy backend package files and install
COPY backend/package*.json ./
RUN npm install

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy backend source and build
COPY backend/src ./src
COPY backend/tsconfig*.json backend/nest-cli.json ./
RUN npm run build

FROM node:20-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/tsconfig.json ./tsconfig.json

EXPOSE 3001

CMD sh -c "npx prisma migrate deploy --schema=./prisma/schema.prisma && npx ts-node --project ./tsconfig.json ./prisma/seed.ts && node dist/src/main.js"
