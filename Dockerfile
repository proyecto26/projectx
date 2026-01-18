FROM node:25

# Install bash and other dependencies
RUN apt-get update && apt-get install -y bash libc6 && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and pnpm-lock.yaml
COPY package.json .
COPY pnpm-lock.yaml .
COPY .npmrc .

# Install pnpm globally
RUN npm install -g pnpm

# Copy the application files
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Install Turborepo globally
RUN npm install -g turbo@latest