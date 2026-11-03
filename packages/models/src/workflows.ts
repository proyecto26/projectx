import { signal } from "@proyecto26/temporal-workflow-client";

/**
 * What the frontend can ask a running order to do. The web app and the order
 * service both implement this object, so they can't disagree. This entry point
 * stays free of NestJS, because it reaches the browser.
 */
export const orderActions = {
  cancel: signal(),
};
