import { Sale } from 'src/admin-sales/sales/entities/sale.entity';
import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SecondaryClient } from './secondary-client.entity';
@Entity()
export class SecondaryClientSale {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Sale, (sale) => sale.secondaryClientSales, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @ManyToOne(() => SecondaryClient, (secondaryClient) => secondaryClient.secondaryClientSales)
  @JoinColumn({ name: 'secondary_client_id' })
  secondaryClient: SecondaryClient;
}