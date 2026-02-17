import mongoose, { Schema, InferSchemaType, Model } from 'mongoose';

const modelJobSchema = new Schema(
  {
    ownerId: {
      type: String,
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    inputFolder: {
      type: String,
      required: false,
      default: ''
    },
    outputFolder: {
      type: String,
      required: false,
      default: ''
    },
    imagePaths: {
      type: [String],
      required: true,
      default: []
    },
    status: {
      type: String,
      required: true,
      enum: ['queued', 'running', 'done', 'failed'],
      default: 'queued',
      index: true,
    },
  },
  { timestamps: true }
);

export type ModelJobDoc = InferSchemaType<typeof modelJobSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ModelJobModel: Model<ModelJobDoc> =
  (mongoose.models.ModelJob as Model<ModelJobDoc>) ||
  mongoose.model<ModelJobDoc>('ModelJob', modelJobSchema);