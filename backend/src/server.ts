import { createApp } from "./app";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { attachModelJobSocketGateway } from "./modules/model-jobs/infrastructure/socket/modelJobSocketGateway";
import { config } from "./shared/config/env";

const app = createApp();
const port = config.PORT;
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

attachModelJobSocketGateway(io);

app.get("/", (req, res) => {
  res.send("Hello from Express + TypeScript + ES Modules!");
});

httpServer.listen(port, () => {
  console.log(`Express server running at http://localhost:${port}`);
});
