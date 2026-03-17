import mongoose, { Schema, InferSchemaType, Model } from 'mongoose';

const passwordResetTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    invalidatedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export type PasswordResetTokenDoc = InferSchemaType<typeof passwordResetTokenSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PasswordResetTokenSchema: Model<PasswordResetTokenDoc> =
  (mongoose.models.PasswordResetToken as Model<PasswordResetTokenDoc>)
  || mongoose.model<PasswordResetTokenDoc>('PasswordResetToken', passwordResetTokenSchema);
