import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Sale } from '../../../transaction/contract/entities/sale.entity';

import { SecondaryClient } from './secondary-client.entity';

@Entity()
export class SecondaryClientSale {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Sale, (sale) => sale.secondaryClientSales)
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @ManyToOne(() => SecondaryClient, (secondaryClient) => secondaryClient.secondaryClientSales)
  @JoinColumn({ name: 'secondary_client_id' })
  secondaryClient: SecondaryClient;
}
