import express from "express";
import uploadRoutes from "./modules/upload/api/uploadRoutes";
import authRoutes from "./modules/auth/api/authRoutes";
import cookieParser from 'cookie-parser';
import cors from "cors";
import modelRoutes from "./modules/model/api/modelRoutes";
import modelJobRoutes from "./modules/model-jobs/api/modelJobRoutes";

export function createApp() {
  const app = express();

  app.use(cors({
    origin: "http://localhost:5173",
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
