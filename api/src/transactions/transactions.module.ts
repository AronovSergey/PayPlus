import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Merchant } from '../entities/merchant.entity';
import { Transaction } from '../entities/transaction.entity';
import { Wallet } from '../entities/wallet.entity';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, Wallet, Merchant])],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
