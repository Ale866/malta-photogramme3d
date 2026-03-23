type UploadCoordinates = {
  x: number;
  y: number;
  z: number;
};

export type UploadDraft = {
  uploadId: string;
  ownerId: string;
  title: string;
  inputFolder: string;
  outputFolder: string;
  totalFiles: number;
  coordinates: UploadCoordinates;
};

const drafts = new Map<string, UploadDraft>();

export const uploadDraftStore = {
  save(draft: UploadDraft) {
    drafts.set(draft.uploadId, draft);
    return draft;
  },

  findById(uploadId: string) {
    return drafts.get(uploadId) ?? null;
  },

  delete(uploadId: string) {
    drafts.delete(uploadId);
  },
};
