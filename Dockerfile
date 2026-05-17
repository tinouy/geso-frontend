# --- Stage 1: Base Setup ---
FROM node:18-alpine AS node_base

WORKDIR /app

# --- Stage 2: Builder ---
FROM node_base AS builder

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias con cache mount para builds más rápidos
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Copiar código fuente
COPY . .

# Construir la aplicación
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
RUN npm run build

# --- Stage 3: Production (The Tiny Image) ---
FROM nginx:alpine AS prod

# Copiar los archivos construidos desde el builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
