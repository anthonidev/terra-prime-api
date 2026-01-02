export class NubefactResponseDto {
  type: string;
  errors?: string;
  numero_ticket?: string;
  aceptada_por_sunat?: string;
  sunat_description?: string;
  sunat_note?: string;
  sunat_responsecode?: string;
  sunat_soap_error?: string;
  pdf_zip_base64?: string;
  xml?: string;
  hash?: string;
  enlace_del_pdf?: string;
  enlace_del_xml?: string;
  enlace_del_cdr?: string;
  cadena_para_codigo_qr?: string;
  codigo_hash?: string;
  codigo_de_barras?: string;
}
