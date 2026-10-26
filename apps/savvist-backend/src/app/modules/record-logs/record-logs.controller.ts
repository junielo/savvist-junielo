import { Controller } from '@nestjs/common';
import { RecordLogsService } from './record-logs.service';

@Controller('record-logs')
export class RecordLogsController {
  constructor(private readonly recordLogsService: RecordLogsService) {}
}
