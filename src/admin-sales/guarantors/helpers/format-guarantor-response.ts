export const formatGuarantorResponse = (guarantor) => {
  return {
    id: guarantor.id,
    firstName: guarantor.firstName,
    lastName: guarantor.lastName,
    email: guarantor.email,
    phone: guarantor.phone,
    documentType: guarantor.documentType,
    document: guarantor.document,
    createdAt: guarantor.createdAt,
  };
};