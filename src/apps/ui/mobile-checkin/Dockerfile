FROM node:22-alpine
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Expose standard Expo ports
EXPOSE 8081

# Start the Expo development server
CMD ["npm", "run", "start"]
