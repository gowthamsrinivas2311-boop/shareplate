import app from './app.js';
import { PORT, NODE_ENV } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { sweepExpiredListings, startCron } from './cron/expiry.js';

let server;

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Start listening on configured port
    server = app.listen(PORT, () => {
      console.log(`SharePlate server running in ${NODE_ENV} mode on port ${PORT}`);
    });

    // 3. Run expiry sweep once at boot
    try {
      await sweepExpiredListings();
      console.log('Initial boot expiry sweep completed.');
    } catch (sweepError) {
      console.error('Initial boot expiry sweep encountered an error:', sweepError.message);
    }

    // 4. Start expiry cron scheduler
    const cronTask = startCron();

    // 5. Graceful shutdown handler for SIGTERM and SIGINT
    const handleShutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Initiating graceful shutdown...`);

      if (cronTask) {
        cronTask.stop();
        console.log('Cron tasks stopped.');
      }

      if (server) {
        server.close(async () => {
          console.log('HTTP server closed.');
          await disconnectDB();
          console.log('Graceful shutdown completed.');
          process.exit(0);
        });
      } else {
        await disconnectDB();
        process.exit(0);
      }

      // Force termination if connections take too long to close
      setTimeout(() => {
        console.error('Forced shutdown due to timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error) {
    console.error('Fatal error starting server:', error.message);
    process.exit(1);
  }
};

startServer();
