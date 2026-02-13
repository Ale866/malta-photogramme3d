import mongoose from 'mongoose';
import { config } from '../../config/env';

let connected = false;

export async function connectDb() {
  if (connected) return;

  try {
    await mongoose.connect(config.MONGODB_URI);
    connected = true;
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
}