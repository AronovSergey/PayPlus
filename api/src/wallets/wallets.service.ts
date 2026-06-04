import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../entities/wallet.entity';
import { WalletStatus } from '../types/enums';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletStatusDto } from './dto/update-status.dto';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
  ) {}

  async create(dto: CreateWalletDto): Promise<Wallet> {
    const wallet = this.walletRepo.create({
      externalId: dto.externalId,
      currency: dto.currency,
      balance: '0.00',
      status: WalletStatus.ACTIVE,
    });
    return this.walletRepo.save(wallet);
  }

  async findById(id: string): Promise<Wallet> {
    const wallet = await this.walletRepo.findOne({ where: { id } });
    if (!wallet) {
      throw new NotFoundException(`Wallet ${id} not found`);
    }
    return wallet;
  }

  async findAll(page = 1, limit = 20): Promise<{ data: Wallet[]; total: number }> {
    const [data, total] = await this.walletRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total };
  }

  async updateStatus(id: string, dto: UpdateWalletStatusDto): Promise<Wallet> {
    const wallet = await this.findById(id);
    wallet.status = dto.status;
    return this.walletRepo.save(wallet);
  }
}
