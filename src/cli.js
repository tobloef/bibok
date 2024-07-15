#!/usr/bin/env node

import { log, LogLevel, setLogLevel } from "./utils/logging.js";
import { getBuildConfig, HotConfig, ServeOptions } from "./build-config.js";
import { inspect, parseArgs } from "node:util";
import { runPipelineContinuously, runPipelineOnce } from "./pipeline.js";
import { createHttpServer } from "./server/http-server.js";
import { attachWebSocketServer } from "./server/websocket-server.js";
import { open } from "./utils/open.js";

/** @import { Server } from "node:http"; */

async function cli() {
  const args = getArgs();

  if (args.verbose) {
    setLogLevel(LogLevel.VERBOSE);
  }

  if (args.quiet) {
    setLogLevel(LogLevel.ERROR);
  }

  const buildConfig = await getBuildConfig();

  // Overwrite build config with CLI args
  buildConfig.watch = args.watch ?? buildConfig.watch;
  buildConfig.serve = args.serve && !buildConfig.serve ? new ServeOptions() : buildConfig.serve;
  if (buildConfig.serve) {
    buildConfig.serve.hot = args.hot ? new HotConfig() : buildConfig.serve.hot;
    buildConfig.serve.open = args.open ?? buildConfig.serve.open;
  }

  log(LogLevel.VERBOSE, `Using build config: ${inspect(buildConfig, { depth: null })}`);

  await runPipelineOnce(buildConfig);

  if (buildConfig.serve) {
    const server = createHttpServer(buildConfig.serve);
    attachWebSocketServer(server, buildConfig.serve);
    await startServer(server, buildConfig.serve);
  }

  if (buildConfig.watch) {
    await runPipelineContinuously(buildConfig);
  }
}

function getArgs() {
  const { values: args } = parseArgs({
    options: {
      verbose: { type: "boolean" },
      quiet: { type: "boolean" },
      watch: { type: "boolean" },
      serve: { type: "boolean" },
      hot: { type: "boolean" },
      open: { type: "boolean" },
    },
    allowPositionals: true,
  });

  return args;
}

/**
 * @param {Server} server
 * @param {ServeOptions} serveOptions
 */
async function startServer(server, serveOptions) {
  return new Promise((resolve) => {
    const { port, address } = serveOptions;

    server.listen(port, address, () => {
      const url = `http://${address}:${port}/`;

      log(LogLevel.INFO, `🌐 Dev server running at ${url}`);

      if (serveOptions.hot) {
        log(LogLevel.INFO, "🔥 Hot reloading enabled");
      }

      if (serveOptions.open) {
        log(LogLevel.INFO, "🚀 Opening in browser");
        open(url);
      }

      resolve(undefined);
    });
  });
}

await cli();
