import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, RelationId } from "typeorm";
import { User } from "src/users/entities/user.entitiy";
import { Transaction } from "./transaction.entity";

@Entity('wallets')
export class Wallet {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'uuid', default: () => 'gen_random_uuid()', unique: true })
    publicId: string;

    @ManyToOne(() => User, user => user.wallets, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId', referencedColumnName: 'publicId' })
    user: User;

    @RelationId((wallet: Wallet) => wallet.user)
    userId: string;

    @Column({ type: 'varchar' })
    name: string;

    @Column({ type: 'decimal' })
    balance: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @OneToMany(() => Transaction, transaction => transaction.fromWallet)
    outgoingTransactions: Transaction[];

    @OneToMany(() => Transaction, transaction => transaction.toWallet)
    incomingTransactions: Transaction[];
}