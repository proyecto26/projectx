import { startServer } from "./server.js";

const args = process.argv.slice(2);

const portIndex = args.indexOf("--port");
const defaultPort = 4343;
const port = portIndex !== -1 ? parseInt(args[portIndex + 1], 10) : defaultPort;
const verbose = args.includes("--verbose") || args.includes("-v");
const helpRequested = args.includes("--help") || args.includes("-h");

if (helpRequested) {
  console.log(`
Temporal Playground Server

Usage:
  node dist/cli.js [options]

Options:
  --port <number>   HTTP server port (default: 4343)
  --verbose, -v     Enable verbose logging
  --help, -h        Show this help message

Runs as MCP server for Claude Code integration with an HTTP bridge
for the Temporal Workflow Builder HTML playground.
`);
  process.exit(0);
}

console.error(`[temporal-playground] HTTP: http://localhost:${port} | MCP: stdio`);

startServer({ httpPort: port, verbose }).catch((err) => {
  console.error("[temporal-playground] Fatal error:", err);
  process.exit(1);
});
