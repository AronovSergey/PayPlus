import { Controller, Get, Param } from '@nestjs/common';
import { LedgerService } from './ledger.service';

@Controller()
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('wallets/:id/ledger-entries')
  findByWallet(@Param('id') id: string) {
    return this.ledgerService.findByWallet(id);
  }

  @Get('transactions/:id/ledger-entries')
  findByTransaction(@Param('id') id: string) {
    return this.ledgerService.findByTransaction(id);
  }
}
