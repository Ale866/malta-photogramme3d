import mongoose, { Schema, InferSchemaType, Model } from 'mongoose';

const sessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    userAgent: { type: String, required: false },
    ip: { type: String, required: false },
  },
  { timestamps: true }
);

// Optional: TTL index so Mongo can auto-delete expired sessions.
// If you use this, ensure `expiresAt` is set correctly.
// sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SessionDoc = InferSchemaType<typeof sessionSchema> & { _id: mongoose.Types.ObjectId };

export const SessionModel: Model<SessionDoc> =
  (mongoose.models.Session as Model<SessionDoc>) || mongoose.model<SessionDoc>('Session', sessionSchema);