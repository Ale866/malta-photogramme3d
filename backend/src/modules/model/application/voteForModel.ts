import { badRequest, conflict, forbidden, notFound } from "../../../shared/errors/applicationError";
import { ModelsServices } from "./ports";

export async function voteForModel(services: ModelsServices, modelId: string, userId: string): Promise<void> {
  if (!modelId) throw badRequest("Missing modelId", "model_id_required");
  if (!userId) throw badRequest("Missing userId", "user_id_required");

  const model = await services.models.findById(modelId);

  if (!model) throw notFound("Model not found", "model_not_found");
  if (model.userVotesIds.includes(userId)) throw forbidden("User has already voted for this model", "already_voted");
  if (model.ownerId === userId) throw forbidden("User cannot vote for their own model", "cannot_vote_own_model");

  const result = await services.models.vote(modelId, userId);
  if (!result.changed) throw conflict("Vote did not change", "vote_not_changed");
}

export async function unvoteForModel(services: ModelsServices, modelId: string, userId: string): Promise<void> {
  if (!modelId) throw badRequest("Missing modelId", "model_id_required");
  if (!userId) throw badRequest("Missing userId", "user_id_required");

  const model = await services.models.findById(modelId);

  if (!model) throw notFound("Model not found", "model_not_found");
  if (!model.userVotesIds.includes(userId)) throw forbidden("User has not voted for this model", "not_voted");
  if (model.ownerId === userId) throw forbidden("User cannot unvote for their own model", "cannot_unvote_own_model");

  const result = await services.models.unvote(modelId, userId);
  if (!result.changed) throw conflict("Vote did not change", "vote_not_changed");
}
