import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  async create(@Body() dto: CreateCompanyDto) {
    return this.companyService.create(dto);
  }

  @Get()
  async findAll(@Query('name') name?: string) {
    if (name) {
      return this.companyService.findByName(name);
    }

    return this.companyService.findAll();
  }

  @Get(':id/summary')
  async getSummary(@Param('id') id: string) {
    return this.companyService.getSummary(id);
  }

  @Get(':id/repair')
  async repair(@Param('id') id: string) {
    return this.companyService.repair(id);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.companyService.findById(id);
  }
}
