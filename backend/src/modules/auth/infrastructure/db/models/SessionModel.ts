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
  },
  { timestamps: true }
);

export type SessionDoc = InferSchemaType<typeof sessionSchema> & { _id: mongoose.Types.ObjectId };

export const SessionModel: Model<SessionDoc> =
  (mongoose.models.Session as Model<SessionDoc>) || mongoose.model<SessionDoc>('Session', sessionSchema);