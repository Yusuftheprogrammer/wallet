import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { UserRole } from 'src/users/enums/roles.enum';
import { CreateWalletDto } from './dtos/create-wallet.dto';
import { UpdateWalletDto } from './dtos/update-wallet.dto';

@Injectable()
export class WalletsService {
    constructor (
        @InjectRepository(Wallet)
        private walletsRepository: Repository<Wallet>
    ) {}


    async findAll(req) {
        if (req.user?.role === UserRole.USER) {
            return this.walletsRepository.find({ where: { userId: req.user.publicId } });
        } else {
            return this.walletsRepository.find();
        }
    }

    async findOne(publicId: string, req) {
        const  wallet = await this.walletsRepository.findOne({ where: { publicId, userId: req.user.publicId } });
        if (!wallet) throw new NotFoundException('This wallet not found');
        return wallet;
    }

    async create(body: CreateWalletDto, req) {

        const WALLET_TIME_CREATION_LIMIT = 24 * 60 * 60 * 1000;
        const WALLET_CREATION_LIMIT = 3;

        const [wallets, count] = await this.walletsRepository.findAndCount({
            where: { userId: req.user.publicId },
            order: { createdAt: 'DESC' },
            take: 3
        })

        if (count >= WALLET_CREATION_LIMIT) throw new BadRequestException('Wallet limit reached');

        const lastWallet = wallets[0];

        if (lastWallet && lastWallet.createdAt >= new Date(Date.now() - WALLET_TIME_CREATION_LIMIT)) {
            throw new BadRequestException('Wallet creation limit reached');
        }

        const newWallet = this.walletsRepository.create({
            name: body.name,
            userId: req.user.publicId,
            balance: 0.0,
        });

        await this.walletsRepository.save(newWallet);

        return { 
            message: "Wallet created successfully",
            success: true,
            wallet: newWallet
        }



    }


    async update(publicId: string, body: UpdateWalletDto, req) {
        const wallet = await this.walletsRepository.findOne({
            where: { publicId, userId: req.user.publicId }
        });
        if (!wallet) throw new NotFoundException('The wallet is not found');
        const updatedWallet = await this.walletsRepository.save({ ...wallet, ...body });
        return {
            message: "Wallet updated successfully",
            success: true,
            wallet: updatedWallet
        }
    }

    async delete(publicId: string, req) {
        const wallet = await this.walletsRepository.findOne({
            where: { publicId, userId: req.user.publicId }
        });
        if (!wallet) throw new NotFoundException('This wallet does not exist');
        await this.walletsRepository.delete({
            publicId,
            userId: req.user.publicId
        });
        return { 
            message: "Wallet deleted successfully",
            success: true
        }
    }

}
