import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { SttService } from './stt.service';

interface UploadedAudio {
  buffer: Buffer;
}

@ApiTags('stt')
@ApiBearerAuth('Bearer')
@UseGuards(AuthGuard)
@Controller('stt')
export class SttController {
  constructor(private readonly sttService: SttService) {}

  @Post()
  @ApiOperation({
    summary:     '음성 → 텍스트 + 발화 지표',
    description: '오디오(audio 필드)를 Deepgram 으로 전사하고 말 속도·필러·멈칫 지표를 반환합니다.',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('audio'))
  async transcribe(@UploadedFile() file: UploadedAudio) {
    return this.sttService.transcribe(file.buffer);
  }
}
