import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { TransactionStatus, TransactionType } from '../types/enums';
import { ChargeDto } from './dto/charge.dto';
import { RefundDto } from './dto/refund.dto';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('charge')
  charge(@Body() dto: ChargeDto) {
    return this.transactionsService.charge(dto);
  }

  @Post('refund')
  refund(@Body() dto: RefundDto) {
    return this.transactionsService.refund(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionsService.findById(id);
  }

  @Get()
  findAll(
    @Query('walletId') walletId?: string,
    @Query('merchantId') merchantId?: string,
    @Query('type') type?: TransactionType,
    @Query('status') status?: TransactionStatus,
  ) {
    return this.transactionsService.findAll({ walletId, merchantId, type, status });
  }
}
