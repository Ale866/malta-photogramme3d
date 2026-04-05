import mongoose, { Schema, InferSchemaType, Model } from 'mongoose';
import { MODEL_JOB_STATUS } from '../../domain/modelJobRepository';

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
    coordinates: {
      x: {
        type: Number,
        required: false,
      },
      y: {
        type: Number,
        required: false,
      },
      z: {
        type: Number,
        required: false,
      },
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(MODEL_JOB_STATUS),
      default: MODEL_JOB_STATUS.QUEUED,
      index: true,
    },
    stage: {
      type: String,
      required: true,
      default: MODEL_JOB_STATUS.QUEUED,
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
    hasBeenRerun: {
      type: Boolean,
      required: true,
      default: false,
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
