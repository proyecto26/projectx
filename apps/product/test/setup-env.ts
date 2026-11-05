// AppModule validates these environment variables as soon as it's imported.
process.env.NODE_ENV ??= "test";
process.env.PRODUCT_PORT ??= "8083";
process.env.JWT_SECRET ??= "test-secret";
