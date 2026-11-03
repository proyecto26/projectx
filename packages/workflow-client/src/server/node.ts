import type { ServerResponse } from "node:http";

/**
 * Writes a web `Response` to a Node.js response, for Express and NestJS.
 * Resolves when the response ends or the client disconnects.
 */
export async function pipeWorkflowResponse(
  response: Response,
  res: ServerResponse,
): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.flushHeaders();

  if (!response.body) {
    res.end();
    return;
  }
  const reader = response.body.getReader();
  const onClose = () => {
    void reader.cancel().catch(() => undefined);
  };
  res.once("close", onClose);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.write(value)) {
        await new Promise<void>((resolve) => {
          const proceed = () => {
            res.off("drain", proceed);
            res.off("close", proceed);
            resolve();
          };
          res.once("drain", proceed);
          res.once("close", proceed);
        });
      }
    }
  } finally {
    res.off("close", onClose);
    res.end();
  }
}
