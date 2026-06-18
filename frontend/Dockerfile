# =============================================================
# Stage 1: Build the React application
# =============================================================
FROM node:18-alpine AS build

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --silent

# Copy source code
COPY public/ public/
COPY src/ src/

# Set API base URLs to use the Nginx reverse proxy paths
# These are baked into the JS bundle at build time
ENV REACT_APP_API_BASE_URL=/api
ENV REACT_APP_TELEMETRY_API_URL=/api
ENV REACT_APP_REPORTING_API_URL=/api
ENV GENERATE_SOURCEMAP=false
ENV NODE_OPTIONS="--max_old_space_size=4096"

RUN npm run build

# =============================================================
# Stage 2: Serve with Nginx
# =============================================================
FROM nginx:1.25-alpine

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx config (reverse proxy + SPA fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built React app from Stage 1
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
