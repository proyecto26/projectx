export interface SseMessage {
  id?: string;
  event?: string;
  data: string;
}

export interface ParseSseOptions {
  /** Called on every chunk read, comments included, so idle streams can be told apart. */
  onChunk?: () => void;
}

/** Reads Server-Sent Events from a response body, with any chunk boundaries. */
export async function* parseSse(
  body: ReadableStream<Uint8Array>,
  { onChunk }: ParseSseOptions = {},
): AsyncGenerator<SseMessage> {
  const reader = body
    .pipeThrough(
      new TextDecoderStream() as ReadableWritablePair<string, Uint8Array>,
    )
    .getReader();
  let buffer = "";
  let message: Partial<SseMessage> = {};
  let dataLines: string[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      onChunk?.();
      buffer += value;
      const lines = buffer.split(/\r\n|\n|\r(?!$)/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line === "") {
          if (dataLines.length > 0) {
            yield { ...message, data: dataLines.join("\n") };
          }
          message = {};
          dataLines = [];
          continue;
        }
        if (line.startsWith(":")) continue;
        const separator = line.indexOf(":");
        const field = separator === -1 ? line : line.slice(0, separator);
        const value =
          separator === -1 ? "" : line.slice(separator + 1).replace(/^ /, "");
        if (field === "data") dataLines.push(value);
        else if (field === "id") message.id = value;
        else if (field === "event") message.event = value;
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}
