/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Provider } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';

export const CHECKPOINTER = Symbol('CHECKPOINTER');

export const mongoCheckpointerProvider: Provider = {
  provide: CHECKPOINTER,
  inject: [getConnectionToken()],
  useFactory: async (connection: Connection) => {
    const saver = new MongoDBSaver({
      // Cast: Mongoose may bundle a different mongodb driver version
      // than the one the saver was built against.
      client: connection.getClient() as any,
      dbName: connection.name,
    });

    // Creates indexes once at startup. Verify against your installed version:
    // the method may be named setup(), or may not be needed at all.
    await (saver as any).setup?.();

    return saver;
  },
};