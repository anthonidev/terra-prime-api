export interface ProjectListItemDto {
  id: string;
  name: string;
  currency: string;
  isActive: boolean;
  logo: string | null;
  stageCount: number;
  blockCount: number;
  lotCount: number;
  activeLotCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectListResponseDto {
  projects: ProjectListItemDto[];
  total: number;
}
