import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  RelationId,
} from 'typeorm';
import { Wallet } from './wallet.entity';
import { TransactionStatus } from './transaction-status.enum';
import { TransactionType } from './transaction-type.enum';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'uuid',
    name: 'public_id',
    unique: true,
    default: () => 'gen_random_uuid()',
  })
  publicId: string;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
  })
  amount: number;

  @Column({
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.TRANSFER,
  })
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ type: 'varchar', name: 'idempotency_key', nullable: true, unique: true })
  idempotencyKey: string | null;

  @Column({ type: 'uuid', name: 'initiated_by', nullable: true })
  initiatedBy: string | null;

  @CreateDateColumn({
    type: 'timestamp without time zone',
    name: 'starting_date',
    default: () => 'CURRENT_TIMESTAMP',
  })
  startingDate: Date;

  @Column({
    type: 'timestamp without time zone',
    name: 'ending_date',
    nullable: true,
  })
  endingDate: Date | null;

  @ManyToOne(() => Wallet, (wallet) => wallet.outgoingTransactions, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'from_wallet_id' })
  fromWallet: Wallet | null;

  @RelationId((transaction: Transaction) => transaction.fromWallet)
  fromWalletId: number | null;

  @ManyToOne(() => Wallet, (wallet) => wallet.incomingTransactions, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'to_wallet_id' })
  toWallet: Wallet | null;

  @RelationId((transaction: Transaction) => transaction.toWallet)
  toWalletId: number | null;
}
