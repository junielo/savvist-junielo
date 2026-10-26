import { Injectable } from '@nestjs/common';
import { CreateAccountEntryDto } from './dto/create-account-entry.dto';
import { UpdateAccountEntryDto } from './dto/update-account-entry.dto';

@Injectable()
export class AccountEntriesService {
  create(createAccountEntryDto: CreateAccountEntryDto) {
    return 'This action adds a new accountEntry';
  }

  findAll() {
    return `This action returns all accountEntries`;
  }

  findOne(id: number) {
    return `This action returns a #${id} accountEntry`;
  }

  update(id: number, updateAccountEntryDto: UpdateAccountEntryDto) {
    return `This action updates a #${id} accountEntry`;
  }

  remove(id: number) {
    return `This action removes a #${id} accountEntry`;
  }
}
