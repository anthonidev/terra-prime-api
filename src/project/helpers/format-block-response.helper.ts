import { Block } from "../entities/block.entity";
import { BlockResponse } from "../interfaces/block-response.interface";

export const formatBlockResponse = (block: Block): BlockResponse => {
  return {
    id: block.id,
    name: block.name,
    createdAt: block.createdAt,
  };
};