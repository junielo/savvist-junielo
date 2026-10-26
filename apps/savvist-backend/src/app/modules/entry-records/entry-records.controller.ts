import { Controller } from '@nestjs/common';
import { EntryRecordsService } from './entry-records.service';

@Controller('entry-records')
export class EntryRecordsController {
  constructor(private readonly entryRecordsService: EntryRecordsService) {}
}
