export class NubefactInvoiceItemDto {
  unidad_de_medida: string;
  codigo?: string;
  descripcion: string;
  cantidad: number;
  valor_unitario: number;
  precio_unitario: number;
  descuento?: number;
  subtotal: number;
  tipo_de_igv: number;
  igv: number;
  total: number;
}
