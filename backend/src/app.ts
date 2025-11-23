import express from "express";
import uploadRoutes from "./api/routes/upload.js";
import cors from "cors";

export function createApp() {
  const app = express();

  app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
  }));

  app.use(express.json());
  app.use("/upload", uploadRoutes);

  return app;
}
