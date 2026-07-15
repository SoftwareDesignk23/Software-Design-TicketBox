FROM node:22-alpine AS builder
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build the NestJS application
COPY . .
RUN npm run build

# Generate Prisma client if schema exists (uncomment if Prisma is used in build phase)
# RUN npx prisma generate

FROM node:22-alpine
WORKDIR /app

# Copy package.json for production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy built artifacts from the builder stage
COPY --from=builder /app/dist ./dist
# If you are using Prisma, copy the generated client and schema
COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate

# Expose port (adjust if your NestJS app uses a different port)
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]
