import { Participant } from "../entities/participant.entity";

export const formatParticipantResponse = (participant: Participant) => {
  return {
    id: participant.id,
    firstName: participant.firstName,
    lastName: participant.lastName,
    email: participant.email,
    document: participant.document,
    documentType: participant.documentType,
    phone: participant.phone,
    address: participant.address,
    participantType: participant.participantType,
  };
};