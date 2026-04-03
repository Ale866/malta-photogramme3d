import express from "express";
import uploadRoutes from "./modules/upload/api/uploadRoutes";
import authRoutes from "./modules/auth/api/authRoutes";
import cookieParser from 'cookie-parser';
import cors from "cors";
import modelRoutes from "./modules/model/api/modelRoutes";
import modelJobRoutes from "./modules/model-jobs/api/modelJobRoutes";
import { config } from "./shared/config/env";
import { ensureStorageDirectories } from "./shared/config/storage";

export function createApp() {
  ensureStorageDirectories();
  const app = express();
  app.set('trust proxy', 1);

  app.use(cors({
    origin: config.FRONTEND_ORIGIN,
    credentials: true
  }));
  app.use(cookieParser());

  app.use(express.json());
  app.use("/upload", uploadRoutes);
  app.use("/model", modelRoutes);
  app.use("/model-jobs", modelJobRoutes);
  app.use("/auth", authRoutes);

  return app;
}
