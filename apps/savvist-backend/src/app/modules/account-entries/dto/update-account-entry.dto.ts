import { PartialType } from '@nestjs/mapped-types';
import { CreateAccountEntryDto } from './create-account-entry.dto';

export class UpdateAccountEntryDto extends PartialType(CreateAccountEntryDto) {}
