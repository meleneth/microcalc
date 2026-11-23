FROM node:22-trixie-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM debian:trixie-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && sed -i '/listen \[::\]:80 /d' /etc/nginx/sites-enabled/default \
    && nginx -t
COPY --from=build /app/dist /var/www/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
