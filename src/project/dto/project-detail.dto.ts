export interface BlockDetailDto {
  id: string;
  name: string;
  isActive: boolean;
  lotCount: number;
  activeLots: number;
  reservedLots: number;
  soldLots: number;
  inactiveLots: number;
  stageId: string;
}
export interface StageDetailDto {
  id: string;
  name: string;
  isActive: boolean;
  blocks: BlockDetailDto[];
}
export interface ProjectDetailDto {
  id: string;
  name: string;
  currency: string;
  isActive: boolean;
  logo: string | null;
  logoKey: string | null;
  stages: StageDetailDto[];
  createdAt: Date;
  updatedAt: Date;
}
