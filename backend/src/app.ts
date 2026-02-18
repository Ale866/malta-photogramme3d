import express from "express";
import uploadRoutes from "./modules/upload/api/uploadRoutes";
import authRoutes from "./modules/auth/api/authRoutes";
import { connectDb } from "./shared/db/mongoConnection";
import cookieParser from 'cookie-parser';
import cors from "cors";

export function createApp() {
  const app = express();

  app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
  }));
  app.use(cookieParser());

  connectDb();

  app.use(express.json());
  app.use("/upload", uploadRoutes);
  app.use("/auth", authRoutes);

  return app;
}
