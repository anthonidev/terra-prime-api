import { LeadSource } from '../entities/lead-source.entity';
import { Lead } from '../entities/lead.entity';
import { Participant } from 'src/admin-sales/participants/entities/participant.entity';
import { Ubigeo } from '../entities/ubigeo.entity';
import { User } from 'src/user/entities/user.entity';
import { formatSource, formatUbigeo, formatVendor } from './format-lead-participnats-response.helper';

export const formatLeadWithParticipantsSummary = (lead: Lead) => {
  const {
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

  // Get reportPdfUrl from visit with the latest createdAt date
  let reportPdfUrl = null;
  if (visits && visits.length > 0) {
    const latestVisit = visits.reduce((latest, current) => {
      if (!latest) return current;
      return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
    }, visits[0]);
    reportPdfUrl = latestVisit?.reportPdfUrl || null;
  }

  return {
    ...leadData,
    source: formatSource(source),
    ubigeo: formatUbigeo(ubigeo),
    vendor: formatVendor(vendor),
    reportPdfUrl,
  };
};