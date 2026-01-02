import { NubefactInvoiceItemDto } from './nubefact-invoice-item.dto';

export class NubefactInvoiceDto {
  operacion: string;
  tipo_de_comprobante: number;
  serie: string;
  numero: number;
  sunat_transaction: number;
  cliente_tipo_de_documento: number | string;
  cliente_numero_de_documento: string;
  cliente_denominacion: string;
  cliente_direccion?: string;
  cliente_email?: string;
  fecha_de_emision: string; // DD-MM-AAAA
  moneda: number;
  tipo_de_cambio?: number;
  porcentaje_de_igv: number;
  total_gravada?: number;
  total_inafecta?: number;
  total_exonerada?: number;
  total_gratuita?: number;
  total_descuentos?: number;
  total_igv: number;
  total: number;
  enviar_automaticamente_a_la_sunat: boolean;
  enviar_automaticamente_al_cliente: boolean;
  codigo_unico?: string;
  formato_de_pdf?: string;
  observaciones?: string;
  items: NubefactInvoiceItemDto[];

  // Para notas de crédito/débito
  codigo_tipo_nota?: string;
  motivo_nota?: string;
  comprobante_afectado_serie?: string;
  comprobante_afectado_numero?: number;
}
