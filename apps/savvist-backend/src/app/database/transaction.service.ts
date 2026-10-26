import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection } from 'mongoose';

@Injectable()
export class TransactionService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  run<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
    return this.connection.transaction(work);
  }
}