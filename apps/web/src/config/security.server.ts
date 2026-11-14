import { Environment } from "@projectx/models";
import { replaceNewLinesWithSpaces } from "@projectx/ui";

import { environment } from "./app.config.server";

const localDomains =
  environment === Environment.Development
    ? "127.0.0.1:* localhost:* ws://localhost:*"
    : "";
const appDomains = "https://*.projectx.com";
const trustedDomains = [appDomains, localDomains].filter(Boolean).join(" ");

export const defaultSrc = replaceNewLinesWithSpaces(`
  ${trustedDomains}
  https://*.stripe.com
`);

export const scriptSrc = replaceNewLinesWithSpaces(`
  ${defaultSrc}
  
`);

export const frameSrc = replaceNewLinesWithSpaces(`
  ${defaultSrc}
`);

export const connectSrc = replaceNewLinesWithSpaces(`
  ${defaultSrc}
`);
export const mediaSrc = replaceNewLinesWithSpaces(`
  ${defaultSrc}
`);

export const imgSrc = replaceNewLinesWithSpaces(`
  ${defaultSrc}
  https://*.unsplash.com
  https://placehold.co
  https://gravatar.com
  https://*.githubusercontent.com\
  https://tailwindui.com
`);

export const contentSecurityPolicy = replaceNewLinesWithSpaces(`
  default-src 'self' data: blob: ${defaultSrc};
  script-src 'self' 'unsafe-inline' data: blob: ${scriptSrc};
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://rsms.me;
  object-src 'none';
  base-uri 'self';
  connect-src 'self' ${connectSrc};
  font-src 'self' data: https://rsms.me https://fonts.gstatic.com;
  frame-src 'self' ${frameSrc};
  img-src 'self' data: blob: ${imgSrc};
  manifest-src 'self';
  media-src 'self' blob: ${mediaSrc};
  worker-src 'self' blob:;
  form-action 'self';
`);

export const securityHeaders: Record<string, string> = {
  // X-DNS-Prefetch-Control
  "X-DNS-Prefetch-Control": "on",
  // Strict-Transport-Security
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  // X-XSS-Protection
  "X-XSS-Protection": "1; mode=block",
  // X-Frame-Options
  "X-Frame-Options": "SAMEORIGIN",
  // X-Content-Type-Options
  "X-Content-Type-Options": "nosniff",
  // Referrer-Policy
  "Referrer-Policy": "origin-when-cross-origin",
  // Content Security Policy
  "Content-Security-Policy": contentSecurityPolicy,
};
