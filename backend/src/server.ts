import { createApp } from "./app";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { attachModelJobSocketGateway } from "./modules/model-jobs/infrastructure/socket/modelJobSocketGateway";
import { MongoModelJobChangeStreamSubscriber } from "./modules/model-jobs/infrastructure/realtime/mongoModelJobChangeStreamSubscriber";
import { config } from "./shared/config/env";
import { connectDb, disconnectDb } from "./shared/db/mongoConnection";
import { verifyMailer } from "./shared/services/mailService";

async function startServer() {
  await connectDb();

  const app = createApp();
  const port = config.PORT;
  const httpServer = createServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.FRONTEND_ORIGIN,
      credentials: true,
    },
  });

  const modelJobSocketGateway = attachModelJobSocketGateway(io);
  const modelJobUpdates = new MongoModelJobChangeStreamSubscriber(modelJobSocketGateway.emitJobUpdate);
  await modelJobUpdates.start();

  app.get("/", (req, res) => {
    res.send("Hello from Express + TypeScript + ES Modules!");
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`Received ${signal}, shutting down`);

    await modelJobUpdates.stop();
    await closeSocketServer(io);
    await closeHttpServer(httpServer);
    await disconnectDb();
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT").finally(() => process.exit(0));
  });

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM").finally(() => process.exit(0));
  });

  void verifyMailer()
    .then(() => {
      console.log("SMTP mailer verified");
    })
    .catch((error) => {
      console.error("SMTP verification failed:", error);
    });

  httpServer.listen(port, () => {
    console.log(`Express server running at http://localhost:${port}`);
  });
}

function closeHttpServer(server: ReturnType<typeof createServer>): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function closeSocketServer(io: SocketIOServer): Promise<void> {
  return new Promise((resolve) => {
    io.close(() => resolve());
  });
}

void startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
