import { Stage } from "../entities/stage.entity";

export const formatStageResponse = (stage: Stage) => {
  return {
    id: stage.id,
    name: stage.name,
    createdAt: stage.createdAt,
  };
};