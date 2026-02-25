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
      enum: ['queued', 'running', 'succeeded', 'failed', 'done'],
      default: 'queued',
      index: true,
    },
    stage: {
      type: String,
      required: true,
      default: 'starting',
    },
    progress: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    logTail: {
      type: [String],
      required: true,
      default: [],
    },
    error: {
      type: String,
      required: false,
      default: null,
    },
    modelId: {
      type: String,
      required: false,
      default: null,
      index: true,
    },
    startedAt: {
      type: Date,
      required: false,
      default: null,
    },
    finishedAt: {
      type: Date,
      required: false,
      default: null,
    },
  },
  { timestamps: true }
);

export type ModelJobDoc = InferSchemaType<typeof modelJobSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ModelJobSchema: Model<ModelJobDoc> =
  (mongoose.models.ModelJob as Model<ModelJobDoc>) ||
  mongoose.model<ModelJobDoc>('ModelJob', modelJobSchema);
