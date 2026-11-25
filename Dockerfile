FROM node:20-slim

RUN apt-get update && apt-get install -y openssl

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate

CMD ["sh", "-c", "npx prisma db push && node index.js"]
