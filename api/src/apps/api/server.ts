import { ConfigError, loadConfig } from '../../platform/config.js';
import { buildApp } from './app.js';

const SIGNALS = ['SIGINT', 'SIGTERM'] as const;

async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    const message =
      error instanceof ConfigError
        ? error.message
        : 'Failed to load configuration. Set the variables documented in .env.example.';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
    return;
  }

  const app = await buildApp(config);

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info({ signal }, 'shutting down');
    try {
      await app.close();
      process.exit(0);
    } catch (error) {
      app.log.error({ err: error }, 'graceful shutdown failed');
      process.exit(1);
    }
  };

  for (const signal of SIGNALS) {
    process.once(signal, () => {
      void shutdown(signal);
    });
  }

  process.on('unhandledRejection', (reason) => {
    app.log.fatal({ err: reason }, 'unhandled promise rejection');
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    app.log.fatal({ err: error }, 'uncaught exception');
    process.exit(1);
  });

  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(
      { port: config.port, env: config.nodeEnv, corsOrigins: config.corsOrigins },
      'api ready',
    );
  } catch (error) {
    app.log.fatal({ err: error }, 'failed to listen');
    process.exit(1);
  }
}

void main();
