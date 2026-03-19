import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { EvaluationService } from './evaluation.service';

@Controller('evaluation-template')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.evaluationService.findById(id);
  }

  @Get()
  async findByQuery(@Query('analysisId') analysisId?: string,
    @Query('sessionId') sessionId?: string) {
    if (analysisId) {
      return this.evaluationService.findByAnalysisId(analysisId);
    }

    if (sessionId) {
      return this.evaluationService.findBySessionId(sessionId);
    }

    return { error: 'analysisId 또는 sessionId 파라미터가 필요합니다' };
  }
}
