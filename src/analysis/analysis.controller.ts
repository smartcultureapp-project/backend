import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AnalysisService } from './analysis.service';
import { StartAnalysisDto } from './dto/start-analysis.dto';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('start')
  async start(@Body() dto: StartAnalysisDto, @Res() res: Response) {
    await this.analysisService.startAnalysis(dto, res);
  }

  @Get(':sessionId')
  async getAnalysis(@Param('sessionId') sessionId: string) {
    return this.analysisService.getAnalysis(sessionId);
  }
}
