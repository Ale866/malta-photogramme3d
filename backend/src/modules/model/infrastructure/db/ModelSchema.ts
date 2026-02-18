import mongoose, { Schema, InferSchemaType, Model } from 'mongoose';

const modelSchema = new Schema(
  {
    ownerId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    sourceJobId: {
      type: String,
      required: false,
      index: true,
    },
    outputFolder: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export type ModelDoc = InferSchemaType<typeof modelSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ModelSchema: Model<ModelDoc> =
  (mongoose.models.Model as Model<ModelDoc>) ||
  mongoose.model<ModelDoc>('Model', modelSchema);