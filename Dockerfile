# Use official Node.js LTS image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json package-lock.json* ./
RUN npm install --production

# Bundle app source
COPY . .

# Create uploads dir
RUN mkdir -p public/uploads

# Expose port
EXPOSE 3000

CMD [ "node", "server.js" ]
