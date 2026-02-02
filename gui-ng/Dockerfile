# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Pulisci cache npm
RUN npm cache clean --force

# Copia i file di configurazione
COPY package.json ./

# Installa le dipendenze dal registry npm
RUN npm install --legacy-peer-deps --prefer-online

# Copia il resto dei file
COPY . .

# Build dell'applicazione
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Installa bash per lo script
RUN apk add --no-cache bash

# Copia la configurazione nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Copia l'applicazione buildata
COPY --from=builder /app/dist/opensecureconf-admin /usr/share/nginx/html

# Copia lo script di entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
