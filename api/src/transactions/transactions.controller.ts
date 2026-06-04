import { Body, Controller, Post } from '@nestjs/common';
import { ChargeDto } from './dto/charge.dto';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('charge')
  charge(@Body() dto: ChargeDto) {
    return this.transactionsService.charge(dto);
  }
}
