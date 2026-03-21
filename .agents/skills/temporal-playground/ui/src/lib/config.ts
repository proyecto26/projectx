/** Base URL for the temporal-playground HTTP server */
export const BASE_URL =
  window.location.protocol === "file:"
    ? "http://localhost:4343"
    : window.location.origin;
