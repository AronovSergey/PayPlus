import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletStatusDto } from './dto/update-status.dto';
import { WalletsService } from './wallets.service';

@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  create(@Body() dto: CreateWalletDto) {
    return this.walletsService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.walletsService.findById(id);
  }

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.walletsService.findAll(Number(page) || 1, Number(limit) || 20);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateWalletStatusDto) {
    return this.walletsService.updateStatus(id, dto);
  }
}
