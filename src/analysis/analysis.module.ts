import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CompanyModule } from '../company/company.module';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';

@Module({
  imports:     [CompanyModule, AuthModule],
  controllers: [AnalysisController],
  providers:   [AnalysisService],
})
export class AnalysisModule {}
