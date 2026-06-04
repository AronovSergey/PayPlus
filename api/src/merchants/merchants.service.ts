import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from '../entities/merchant.entity';
import { MerchantStatus } from '../types/enums';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantStatusDto } from './dto/update-status.dto';

@Injectable()
export class MerchantsService {
  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
  ) {}

  async create(dto: CreateMerchantDto): Promise<Merchant> {
    const merchant = this.merchantRepo.create({
      name: dto.name,
      status: MerchantStatus.ACTIVE,
    });
    return this.merchantRepo.save(merchant);
  }

  async findById(id: string): Promise<Merchant> {
    const merchant = await this.merchantRepo.findOne({ where: { id } });
    if (!merchant) {
      throw new NotFoundException(`Merchant ${id} not found`);
    }
    return merchant;
  }

  async findAll(page = 1, limit = 20): Promise<{ data: Merchant[]; total: number }> {
    const [data, total] = await this.merchantRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total };
  }

  async updateStatus(id: string, dto: UpdateMerchantStatusDto): Promise<Merchant> {
    const merchant = await this.findById(id);
    merchant.status = dto.status;
    return this.merchantRepo.save(merchant);
  }
}
