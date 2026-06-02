import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { ResumeAnalysisResponseDto } from '../docs/response-schemas';
import { CreateResumeDto } from './dto/create-resume.dto';
import { ResumeService } from './resume.service';

@ApiTags('resume')
@ApiBearerAuth('Bearer')
@UseGuards(AuthGuard)
@Controller('resume')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post()
  @ApiOperation({
    summary:     '이력서 등록',
    description: '원문 텍스트로 이력서를 저장하고(선택) 세션과 연결합니다. 백그라운드에서 AI 분석이 시작됩니다.',
  })
  @ApiBody({ type: CreateResumeDto })
  @ApiCreatedResponse({
    description: '생성된 ResumeAnalysis', type: ResumeAnalysisResponseDto,
  })
  async create(@Body() dto: CreateResumeDto, @Req() req: Request) {
    return this.resumeService.create(req.user!.sub, dto);
  }

  @Get()
  @ApiOperation({
    summary:     '내 이력서 목록',
    description: '로그인한 사용자의 이력서 목록을 반환합니다.',
  })
  @ApiOkResponse({
    description: 'ResumeAnalysis[]', type: [ResumeAnalysisResponseDto],
  })
  async list(@Req() req: Request) {
    return this.resumeService.findAllForUser(req.user!.sub);
  }

  @Get(':id')
  @ApiOperation({
    summary:     '이력서 단건',
    description: 'ID로 이력서를 조회합니다. 본인 것만 조회 가능합니다.',
  })
  @ApiParam({
    name: 'id', description: 'ResumeAnalysis ID',
  })
  @ApiOkResponse({
    description: 'ResumeAnalysis 레코드', type: ResumeAnalysisResponseDto,
  })
  async getOne(@Param('id') id: string, @Req() req: Request) {
    return this.resumeService.findOneForUser(id, req.user!.sub);
  }

  @Post(':id/reanalyze')
  @ApiOperation({
    summary:     '이력서 재분석',
    description: '요약이 비어있는 이력서의 AI 요약 분석을 다시 트리거합니다.',
  })
  @ApiParam({
    name: 'id', description: 'ResumeAnalysis ID',
  })
  @ApiOkResponse({
    description: 'ResumeAnalysis 레코드', type: ResumeAnalysisResponseDto,
  })
  async reanalyze(@Param('id') id: string, @Req() req: Request) {
    return this.resumeService.reanalyze(id, req.user!.sub);
  }

  @Get(':id/file')
  @ApiOperation({
    summary:     '이력서 원본 파일 다운로드',
    description: '등록 시 저장한 원본 이력서 파일을 반환합니다.',
  })
  @ApiParam({
    name: 'id', description: 'ResumeAnalysis ID',
  })
  async getFile(@Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response) {
    const file = await this.resumeService.getFile(id, req.user!.sub);
    const buffer = Buffer.from(file.fileData!, 'base64');
    const name = encodeURIComponent(file.fileName ?? 'resume');

    res.setHeader('Content-Type', file.fileType ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${name}`);
    res.send(buffer);
  }
}
