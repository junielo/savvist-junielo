import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly model: ChatGoogleGenerativeAI;

  constructor(private readonly config: ConfigService) {
    const modelName = this.config.get<string>('GEMINI_MODEL', 'gemini-1.5-flash');
    const apiKey = this.config.get<string>('GEMINI_API_KEY');

    this.model = new ChatGoogleGenerativeAI({
      model: modelName,
      temperature: 0.2,
      apiKey,
    });
  }

  getModel() {
    return this.model;
  }
}
