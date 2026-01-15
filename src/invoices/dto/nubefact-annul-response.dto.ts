export class NubefactAnnulResponseDto {
  numero: number;
  enlace: string;
  sunat_ticket_numero: string;
  aceptada_por_sunat: boolean | string;
  sunat_description: string | null;
  sunat_note: string | null;
  sunat_responsecode: string | null;
  sunat_soap_error: string;
  enlace_del_pdf: string;
  enlace_del_xml: string;
  enlace_del_cdr: string | null;
}
