import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
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
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import {
  AnswerFeedbackResponseDto,
  InterviewTurnResponseDto,
  NextQuestionResponseDto,
  SessionResponseDto,
} from '../docs/response-schemas';
import { CreateInterviewTurnDto } from './dto/create-interview-turn.dto';
import { LiveHintDto } from './dto/live-hint.dto';
import { SubmitInterviewAnswerDto } from './dto/submit-interview-answer.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { MockInterviewService } from './mock-interview.service';
import { SessionService } from './session.service';

@ApiTags('sessions')
@ApiBearerAuth('Bearer')
@UseGuards(AuthGuard)
@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService,
    private readonly mockInterviewService: MockInterviewService) {}

  @Get()
  @ApiOperation({
    summary:     '내 세션 목록',
    description: '로그인한 사용자의 면접 세션 목록을 반환합니다.',
  })
  @ApiOkResponse({
    description: 'Session[]', type: [SessionResponseDto],
  })
  async list(@Req() req: Request) {
    return this.sessionService.findAllForUser(req.user!.sub);
  }

  @Get(':id/interview-turns')
  @ApiOperation({
    summary:     '면접 턴 목록',
    description: '해당 세션의 질문·답변 턴 목록을 반환합니다.',
  })
  @ApiParam({
    name: 'id', description: 'Session ID',
  })
  @ApiOkResponse({
    description: 'InterviewTurn[]', type: [InterviewTurnResponseDto],
  })
  async listTurns(@Param('id') id: string, @Req() req: Request) {
    return this.sessionService.listInterviewTurns(id, req.user!.sub);
  }

  @Post(':id/interview-turns')
  @ApiOperation({
    summary:     '면접 턴 추가',
    description: '질문/답변/점수 등 턴 레코드를 추가합니다.',
  })
  @ApiParam({
    name: 'id', description: 'Session ID',
  })
  @ApiBody({ type: CreateInterviewTurnDto })
  @ApiCreatedResponse({
    description: '생성된 InterviewTurn', type: InterviewTurnResponseDto,
  })
  async addTurn(@Param('id') id: string,
    @Body() dto: CreateInterviewTurnDto,
    @Req() req: Request) {
    return this.sessionService.addInterviewTurn(id, req.user!.sub, dto);
  }

  @Post(':id/interview/next-question')
  @ApiOperation({
    summary:     '다음 모의 면접 질문',
    description: '모의 면접 플로우에서 다음 질문을 생성·반환합니다.',
  })
  @ApiParam({
    name: 'id', description: 'Session ID',
  })
  @ApiOkResponse({
    description: '다음 질문 페이로드', type: NextQuestionResponseDto,
  })
  async nextInterviewQuestion(@Param('id') id: string, @Req() req: Request) {
    return this.mockInterviewService.nextQuestion(id, req.user!.sub);
  }

  @Post(':id/interview/answer')
  @ApiOperation({
    summary:     '모의 면접 답변 제출',
    description: '사용자 답변을 제출하고 피드백 등을 반환합니다.',
  })
  @ApiParam({
    name: 'id', description: 'Session ID',
  })
  @ApiBody({ type: SubmitInterviewAnswerDto })
  @ApiOkResponse({
    description: '채점·피드백 등 결과', type: AnswerFeedbackResponseDto,
  })
  async submitInterviewAnswer(@Param('id') id: string,
    @Body() dto: SubmitInterviewAnswerDto,
    @Req() req: Request) {
    return this.mockInterviewService.submitAnswer(id, req.user!.sub, dto);
  }

  @Post(':id/interview/live-hint')
  @ApiOperation({
    summary:     '실시간 코칭 힌트(무음 시점)',
    description: '답변 도중 무음 시점에 지금까지의 발화를 보내 한 문장 코칭을 받습니다.',
  })
  @ApiParam({
    name: 'id', description: 'Session ID',
  })
  @ApiBody({ type: LiveHintDto })
  async interviewLiveHint(@Param('id') id: string,
    @Body() dto: LiveHintDto,
    @Req() req: Request) {
    return this.mockInterviewService.liveHint(id, req.user!.sub, dto.partial);
  }

  @Post(':id/interview/report')
  @ApiOperation({
    summary:     '최종 면접 리포트 생성',
    description: '면접 종료 후 면접관 패널의 채점·총평 리포트를 생성·저장·반환합니다.',
  })
  @ApiParam({
    name: 'id', description: 'Session ID',
  })
  async generateInterviewReport(@Param('id') id: string, @Req() req: Request) {
    return this.mockInterviewService.finalReport(id, req.user!.sub);
  }

  @Get(':id/expected-questions')
  @ApiOperation({
    summary:     '맞춤 예상 질문',
    description: '지원자 이력서 + 회사 분석을 합쳐 만든 맞춤 예상 질문을 반환합니다(캐시, refresh=true 로 재생성).',
  })
  @ApiParam({
    name: 'id', description: 'Session ID',
  })
  async expectedQuestions(@Param('id') id: string,
    @Query('refresh') refresh: string | undefined,
    @Req() req: Request) {
    return this.mockInterviewService.expectedQuestions(id, req.user!.sub, refresh === 'true');
  }

  @Get(':id')
  @ApiOperation({
    summary:     '세션 단건',
    description: '세션 상세를 조회합니다. 본인 세션만 가능합니다.',
  })
  @ApiParam({
    name: 'id', description: 'Session ID',
  })
  @ApiOkResponse({
    description: 'Session 레코드', type: SessionResponseDto,
  })
  async getOne(@Param('id') id: string, @Req() req: Request) {
    return this.sessionService.findOneForUser(id, req.user!.sub);
  }

  @Patch(':id')
  @ApiOperation({
    summary:     '세션 수정',
    description: 'phase, resumeAnalysisId, evaluationSheetId 등을 갱신합니다.',
  })
  @ApiParam({
    name: 'id', description: 'Session ID',
  })
  @ApiBody({ type: UpdateSessionDto })
  @ApiOkResponse({
    description: '갱신된 Session', type: SessionResponseDto,
  })
  async patch(@Param('id') id: string,
    @Body() dto: UpdateSessionDto,
    @Req() req: Request) {
    return this.sessionService.updateForUser(id, req.user!.sub, dto);
  }
}
