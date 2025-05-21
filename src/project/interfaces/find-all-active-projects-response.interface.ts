import { CurrencyType } from "../dto/bulk-project-upload.dto";

export interface FindAllActiveProjectsResponse {
  id: string;
  name: string;
  currency: CurrencyType;
  logo: string | null;
  logoPublicId: string | null;
  projectCode: string | null;
  createdAt: Date;
}