import { DocumentType } from 'src/lead/entities/lead.entity';
import { ParticipantType } from '../entities/participant.entity';

export interface ParticipantResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  document: string;
  documentType: DocumentType;
  phone: string;
  address: string;
  participantType: ParticipantType;
}