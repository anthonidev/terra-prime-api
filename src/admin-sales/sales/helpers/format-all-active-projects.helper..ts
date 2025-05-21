import { Project } from "src/project/entities/project.entity";
import { FindAllActiveProjectsResponse } from "src/project/interfaces/find-all-active-projects-response.interface";

export const formatAllActiveProjects = 
  (project: Project): FindAllActiveProjectsResponse => {
  return {
    id: project.id,
    name: project.name,
    currency: project.currency,
    logo: project.logo,
    logoPublicId: project.logoPublicId,
    projectCode: project.projectCode,
    createdAt: project.createdAt,
  };
};