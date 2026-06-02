import { DeepgramClient } from '@deepgram/sdk';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export interface SpeechMetrics {
  transcript:  string;
  durationSec: number;
  wordCount:   number;
  wordsPerMin: number;
  fillerCount: number;
  pauseCount:  number;
}

// 한국어 추임새/필러 후보 (Deepgram filler_words 는 영어 위주라 직접 카운트)
const KOREAN_FILLERS = new Set([
  '음', '어', '그', '저기', '뭐', '그니까', '그러니까', '이제', '인제', '약간', '막',
]);

const PAUSE_THRESHOLD_SEC = 0.7;

@Injectable()
export class SttService {
  private readonly logger = new Logger(SttService.name);
  private readonly client: DeepgramClient | null = process.env.DEEPGRAM_API_KEY
    ? new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY })
    : null;

  async transcribe(audio: Buffer): Promise<SpeechMetrics> {
    if (!this.client) {
      throw new ServiceUnavailableException('DEEPGRAM_API_KEY 가 설정되지 않았습니다.');
    }

    // filler_words 는 영어 전용이라 ko 와 함께 보내면 400 → 한국어 필러는 아래에서 직접 카운트
    const body = await this.client.listen.v1.media.transcribeFile(audio, {
      model:     'nova-2',
      language:  'ko',
      punctuate: true,
    });

    const results = 'results' in body ? body.results : undefined;
    const metadata = 'metadata' in body ? body.metadata : undefined;
    const alt = results?.channels?.[0]?.alternatives?.[0];
    const transcript = alt?.transcript ?? '';
    const words = alt?.words ?? [];
    const durationSec = Math.round((metadata?.duration ?? 0) * 10) / 10;
    const wordCount = words.length;
    const wordsPerMin = durationSec > 0 ? Math.round((wordCount / durationSec) * 60) : 0;

    let fillerCount = 0;
    let pauseCount = 0;

    for (let i = 0; i < words.length; i++) {
      const raw = (words[i].word ?? '').replace(/[.,!?]/g, '').trim();

      if (KOREAN_FILLERS.has(raw)) {
        fillerCount++;
      }

      if (i > 0 && words[i].start - words[i - 1].end > PAUSE_THRESHOLD_SEC) {
        pauseCount++;
      }
    }

    this.logger.log(`STT 완료 ${durationSec}s words=${wordCount} wpm=${wordsPerMin} fillers=${fillerCount} pauses=${pauseCount}`);

    return {
      transcript, durationSec, wordCount, wordsPerMin, fillerCount, pauseCount,
    };
  }
}
