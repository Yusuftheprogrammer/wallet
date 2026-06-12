import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { DataSource, In, Repository } from 'typeorm';
import { UserRole } from 'src/users/enums/roles.enum';
import { CreateWalletDto } from './dtos/create-wallet.dto';
import { UpdateWalletDto } from './dtos/update-wallet.dto';
import { SendMoneyDto } from './dtos/send-money.dto';
import { DepositMoneyDto } from './dtos/deposit-money.dto';
import { TransactionStatus } from './entities/transaction-status.enum';
import { TransactionType } from './entities/transaction-type.enum';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private walletsRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
    private dataSource: DataSource,
  ) {}

  async findAll(req) {
    if (req.user?.role === UserRole.USER) {
      return this.walletsRepository.find({
        where: { userId: req.user.publicId },
      });
    }
    return this.walletsRepository.find();
  }

  async findOne(publicId: string, req) {
    const where =
      req.user?.role === UserRole.ADMIN
        ? { publicId }
        : { publicId, userId: req.user.publicId };

    const wallet = await this.walletsRepository.findOne({ where });
    if (!wallet) throw new NotFoundException('This wallet not found');
    return wallet;
  }

  async create(body: CreateWalletDto, req) {
    const WALLET_TIME_CREATION_LIMIT = 24 * 60 * 60 * 1000;
    const WALLET_CREATION_LIMIT = 3;

    const [wallets, count] = await this.walletsRepository.findAndCount({
      where: { userId: req.user.publicId },
      order: { createdAt: 'DESC' },
      take: 3,
    });

    if (count >= WALLET_CREATION_LIMIT) {
      throw new BadRequestException('Wallet limit reached');
    }

    const lastWallet = wallets[0];

    if (
      lastWallet &&
      lastWallet.createdAt >=
        new Date(Date.now() - WALLET_TIME_CREATION_LIMIT)
    ) {
      throw new BadRequestException('Wallet creation limit reached');
    }

    const newWallet = this.walletsRepository.create({
      name: body.name,
      userId: req.user.publicId,
      balance: 0.0,
    });

    await this.walletsRepository.save(newWallet);

    return {
      message: 'Wallet created successfully',
      success: true,
      wallet: newWallet,
    };
  }

  async adminCreate(body: CreateWalletDto, userId: string) {
    const userWalletCount = await this.walletsRepository.count({
      where: { userId },
    });

    if (userWalletCount >= 3) {
      throw new BadRequestException('Wallet limit reached for this user');
    }

    const newWallet = this.walletsRepository.create({
      name: body.name,
      userId,
      balance: 0.0,
    });

    await this.walletsRepository.save(newWallet);

    return {
      message: 'Wallet created successfully',
      success: true,
      wallet: newWallet,
    };
  }

  async update(publicId: string, body: UpdateWalletDto, req) {
    const wallet = await this.walletsRepository.findOne({
      where: { publicId, userId: req.user.publicId },
    });
    if (!wallet) throw new NotFoundException('The wallet is not found');
    const updatedWallet = await this.walletsRepository.save({
      ...wallet,
      ...body,
    });
    return {
      message: 'Wallet updated successfully',
      success: true,
      wallet: updatedWallet,
    };
  }

  async delete(publicId: string, req) {
    const wallet = await this.walletsRepository.findOne({
      where: { publicId, userId: req.user.publicId },
    });
    if (!wallet) throw new NotFoundException('This wallet does not exist');
    await this.walletsRepository.delete({
      publicId,
      userId: req.user.publicId,
    });
    return {
      message: 'Wallet deleted successfully',
      success: true,
    };
  }

  async findTransactions(req) {
    const qb = this.transactionsRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.fromWallet', 'fromWallet')
      .leftJoinAndSelect('transaction.toWallet', 'toWallet')
      .orderBy('transaction.startingDate', 'DESC');

    if (req.user?.role === UserRole.USER) {
      qb.andWhere(
        '(transaction.initiatedBy = :userId OR fromWallet.userId = :userId OR toWallet.userId = :userId)',
        { userId: req.user.publicId },
      );
    }

    return qb.getMany();
  }

  async findTransaction(publicId: string, req) {
    const transaction = await this.transactionsRepository.findOne({
      where: { publicId },
      relations: { fromWallet: true, toWallet: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (req.user?.role === UserRole.USER) {
      const userId = req.user.publicId;
      const ownsTransaction =
        transaction.initiatedBy === userId ||
        transaction.fromWallet?.userId === userId ||
        transaction.toWallet?.userId === userId;

      if (!ownsTransaction) {
        throw new ForbiddenException('Access denied');
      }
    }

    return transaction;
  }

  async sendMoney(sendMoneyDto: SendMoneyDto, req) {
    const { senderWalletId, receiverWalletId, amount, idempotencyKey } =
      sendMoneyDto;

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    if (senderWalletId === receiverWalletId) {
      throw new BadRequestException('Cannot send money to the same wallet');
    }

    const existing = await this.transactionsRepository.findOne({
      where: { idempotencyKey },
      relations: { fromWallet: true, toWallet: true },
    });

    if (existing) {
      return this.formatTransferResponse(existing);
    }

    return await this.dataSource
      .transaction(async (transactionalEntityManager) => {
        const wallets = await transactionalEntityManager.find(Wallet, {
          where: {
            publicId: In([senderWalletId, receiverWalletId]),
          },
          lock: { mode: 'pessimistic_write' },
        });

        const senderWallet = wallets.find(
          (w) => w.publicId === senderWalletId,
        );
        const receiverWallet = wallets.find(
          (w) => w.publicId === receiverWalletId,
        );

        if (!senderWallet) {
          throw new NotFoundException('Sender wallet not found');
        }
        if (!receiverWallet) {
          throw new NotFoundException('Receiver wallet not found');
        }

        if (senderWallet.userId !== req.user.publicId) {
          throw new ForbiddenException(
            'You can only send money from your own wallets',
          );
        }

        if (Number(senderWallet.balance) < amount) {
          throw new BadRequestException('Insufficient funds');
        }

        senderWallet.balance = Number(senderWallet.balance) - amount;
        receiverWallet.balance = Number(receiverWallet.balance) + amount;

        await transactionalEntityManager.save(senderWallet);
        await transactionalEntityManager.save(receiverWallet);

        const transaction = transactionalEntityManager.create(Transaction, {
          amount,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.COMPLETED,
          idempotencyKey,
          initiatedBy: req.user.publicId,
          endingDate: new Date(),
          fromWallet: senderWallet,
          toWallet: receiverWallet,
        });

        const saved = await transactionalEntityManager.save(transaction);

        return this.formatTransferResponse(saved, senderWallet.balance);
      })
      .catch((error) => {
        if (
          error instanceof NotFoundException ||
          error instanceof BadRequestException ||
          error instanceof ForbiddenException
        ) {
          throw error;
        }
        throw new InternalServerErrorException(
          'Transaction failed and was safely rolled back',
        );
      });
  }

  async deposit(depositMoneyDto: DepositMoneyDto, req) {
    const { walletId, amount } = depositMoneyDto;

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, {
        where: { publicId: walletId, userId: req.user.publicId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) throw new NotFoundException('Wallet not found');

      wallet.balance = Number(wallet.balance) + amount;
      await manager.save(wallet);

      const transaction = manager.create(Transaction, {
        amount,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        initiatedBy: req.user.publicId,
        endingDate: new Date(),
        toWallet: wallet,
      });

      await manager.save(transaction);

      return {
        message: 'Money was deposited successfully',
        success: true,
        balance: wallet.balance,
        transactionId: transaction.publicId,
      };
    });
  }

  async withdraw(withdrawDto: DepositMoneyDto, req) {
    const { walletId, amount } = withdrawDto;

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, {
        where: { publicId: walletId, userId: req.user.publicId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) throw new NotFoundException('Wallet not found');

      if (Number(wallet.balance) < amount) {
        throw new BadRequestException('Insufficient funds');
      }

      wallet.balance = Number(wallet.balance) - amount;
      await manager.save(wallet);

      const transaction = manager.create(Transaction, {
        amount,
        type: TransactionType.WITHDRAW,
        status: TransactionStatus.COMPLETED,
        initiatedBy: req.user.publicId,
        endingDate: new Date(),
        fromWallet: wallet,
      });

      await manager.save(transaction);

      return {
        message: 'Money was withdrawn successfully',
        success: true,
        balance: wallet.balance,
        transactionId: transaction.publicId,
      };
    });
  }

  private formatTransferResponse(
    transaction: Transaction,
    newSenderBalance?: number,
  ) {
    return {
      success: true,
      message: 'Transaction completed successfully',
      transactionId: transaction.publicId,
      status: transaction.status,
      amount: Number(transaction.amount),
      newSenderBalance:
        newSenderBalance ??
        (transaction.fromWallet
          ? Number(transaction.fromWallet.balance)
          : undefined),
    };
  }
}
