import { LeadSource } from '../entities/lead-source.entity';
import { Lead } from '../entities/lead.entity';
import { Participant } from 'src/admin-sales/participants/entities/participant.entity';
import { Ubigeo } from '../entities/ubigeo.entity';
import { User } from 'src/user/entities/user.entity';
import { formatSource, formatUbigeo, formatVendor } from './format-lead-participnats-response.helper';

export const formatLeadWithParticipantsSummary = (lead: Lead) => {
  const {
    createdAt,
    liner,
    telemarketingSupervisor,
    telemarketingConfirmer,
    telemarketer,
    fieldManager,
    fieldSupervisor,
    fieldSeller,
    source,
    ubigeo,
    vendor,
    visits,
    interestProjects,
    companionFullName,
    companionDni,
    companionRelationship,
    metadata,
    ...leadData
  } = lead;

  return {
    ...leadData,
    source: formatSource(source),
    ubigeo: formatUbigeo(ubigeo),
    vendor: formatVendor(vendor),
  };
};