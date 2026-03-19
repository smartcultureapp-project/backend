import { Module } from '@nestjs/common';
import { CompanyModule } from '../company/company.module';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';

@Module({
  imports:     [CompanyModule],
  controllers: [AnalysisController],
  providers:   [AnalysisService],
})
export class AnalysisModule {}
