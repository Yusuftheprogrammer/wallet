import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('wallets')
export class Wallet {
    @PrimaryGeneratedColumn()
    id: number;


    @Column({ type: 'uuid', default: () => 'gen_random_uuid()', unique: true })
    publicId: string;

    @Column({ type: 'varchar' })
    userId: number;

    @Column({ type: 'varchar' })
    name: string;

    @Column({ type: 'decimal' })
    balance: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    

}