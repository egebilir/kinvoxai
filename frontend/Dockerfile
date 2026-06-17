FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json next.config.js ./
COPY src ./src
COPY public ./public

EXPOSE 3000

CMD ["npx", "next", "dev", "--port", "3000", "--hostname", "0.0.0.0"]
