# Use the official Node.js image as the base image
FROM node:20.10.0

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json .
COPY package-lock.json .
COPY .npmrc .

# Clean npm cache and rebuild node-gyp
RUN npm cache clean --force
RUN npm rebuild node-gyp

# Install bash
RUN apt-get update && apt-get install -y bash

# Install dependencies
RUN npm ci

# Copy the application files
COPY . .

# Install Nx globally
RUN npm add --global nx@latest