import { DocumentType } from 'src/lead/enums/document-type.enum';
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