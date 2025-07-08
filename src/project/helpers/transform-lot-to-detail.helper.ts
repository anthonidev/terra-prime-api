import { LotDetailResponseDto } from "../dto/lot.dto";
import { Lot } from "../entities/lot.entity";

export const transformLotToDetail = (lot: Lot): LotDetailResponseDto => {
  return {
    id: lot.id,
    name: lot.name,
    area: lot.area,
    lotPrice: lot.lotPrice,
    urbanizationPrice: lot.urbanizationPrice,
    totalPrice: lot.totalPrice,
    status: lot.status,
    blockId: lot.block.id,
    blockName: lot.block.name,
    stageId: lot.block.stage.id,
    stageName: lot.block.stage.name,
    projectId: lot.block.stage.project.id,
    projectName: lot.block.stage.project.name,
    projectCurrency: lot.block.stage.project.currency,
    createdAt: lot.createdAt,
    updatedAt: lot.updatedAt,
  };
};