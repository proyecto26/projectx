# Use the official Node.js image as the base image
FROM node:22

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and pnpm-lock.yaml
COPY package.json .
COPY pnpm-lock.yaml .
COPY .npmrc .

# Install pnpm globally
RUN npm install -g pnpm

# Install bash
RUN apt-get update && apt-get install -y bash

# Copy the application files
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Install Turborepo globally
RUN npm install -g turbo@latest