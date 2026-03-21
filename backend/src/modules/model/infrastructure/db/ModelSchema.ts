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
    coordinates: {
      type: {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        z: { type: Number, required: true },
      },
      required: true
    },
    createdAt: {
      type: Date,
      default: null,
    },
    userVotesIds: {
      type: [String],
      default: [],
    }
  },
  { timestamps: true }
);

export type ModelDoc = InferSchemaType<typeof modelSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ModelSchema: Model<ModelDoc> =
  (mongoose.models.Model as Model<ModelDoc>) ||
  mongoose.model<ModelDoc>('Model', modelSchema);