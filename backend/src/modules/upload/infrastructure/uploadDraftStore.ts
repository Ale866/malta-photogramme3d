type UploadCoordinates = {
  x: number;
  y: number;
  z: number;
};

type UploadSourceType = "images" | "video";

export type UploadDraft = {
  uploadId: string;
  ownerId: string;
  title: string;
  inputFolder: string;
  outputFolder: string;
  type: UploadSourceType;
  totalFiles: number;
  coordinates: UploadCoordinates;
  videoPath: string | null;
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

  update(uploadId: string, patch: Partial<UploadDraft>) {
    const current = drafts.get(uploadId);
    if (!current) return null;

    const next = { ...current, ...patch };
    drafts.set(uploadId, next);
    return next;
  },
};
