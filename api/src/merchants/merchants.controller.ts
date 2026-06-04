import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantStatusDto } from './dto/update-status.dto';
import { MerchantsService } from './merchants.service';

@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Post()
  create(@Body() dto: CreateMerchantDto) {
    return this.merchantsService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.merchantsService.findById(id);
  }

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.merchantsService.findAll(Number(page) || 1, Number(limit) || 20);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateMerchantStatusDto) {
    return this.merchantsService.updateStatus(id, dto);
  }
}
