import { LeadSource } from '../entities/lead-source.entity';
import { Lead } from '../entities/lead.entity';
import { Participant } from 'src/admin-sales/participants/entities/participant.entity';
import { Ubigeo } from '../entities/ubigeo.entity';
import { User } from 'src/user/entities/user.entity';
import { LeadVisit } from '../entities/lead-visit.entity';

// Helper para formatear un participante individual
export const formatParticipant = (participant: Participant | null | undefined) => {
  if (!participant) return null;
  
  return {
    firstName: participant.firstName,
    lastName: participant.lastName,
    createdAt: participant.createdAt,
  };
};

export const formatSource = (source: LeadSource | null | undefined) => {
  if (!source) return null;
  
  return {
    id: source.id,
    name: source.name,
    isActive: source.isActive,
    createdAt: source.createdAt,
  };
};

// Helper para formatear ubigeo
export const formatUbigeo = (ubigeo: Ubigeo | null | undefined) => {
  if (!ubigeo) return null;
  
  return {
    id: ubigeo.id,
    name: ubigeo.name,
    code: ubigeo.code,
    parentId: ubigeo.parentId,
  };
};

// Helper para formatear vendor (User)
export const formatVendor = (vendor: User | null | undefined) => {
  if (!vendor) return null;
  
  return {
    document: vendor.document,
    firstName: vendor.firstName,
    lastName: vendor.lastName,
    createdAt: vendor.createdAt,
  };
};

export const formatVisit = (visit: LeadVisit) => {
  const { liner, ...visitData } = visit;
  return visitData;
};

// Helper para formatear array de visitas
export const formatVisits = (visits: LeadVisit[] | null | undefined) => {
  if (!visits || visits.length === 0) return [];
  return visits.map(visit => formatVisit(visit));
};

export const formatLeadWithParticipants = (lead: Lead) => {
  const {
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
    ...leadData
  } = lead;

  return {
    ...leadData,
    visits: formatVisits(visits),
    source: formatSource(source),
    ubigeo: formatUbigeo(ubigeo),
    vendor: formatVendor(vendor),
    liner: formatParticipant(liner),
    telemarketingSupervisor: formatParticipant(telemarketingSupervisor),
    telemarketingConfirmer: formatParticipant(telemarketingConfirmer),
    telemarketer: formatParticipant(telemarketer),
    fieldManager: formatParticipant(fieldManager),
    fieldSupervisor: formatParticipant(fieldSupervisor),
    fieldSeller: formatParticipant(fieldSeller),
  };
};