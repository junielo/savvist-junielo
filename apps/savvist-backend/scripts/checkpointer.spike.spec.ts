import {
  Annotation,
  Command,
  END,
  START,
  StateGraph,
  interrupt,
} from '@langchain/langgraph';
import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
import { MongoClient } from 'mongodb';

const URI = process.env['MONGODB_URI'] ?? 'mongodb://localhost:27017';
const DB = 'savvist_spike';

const State = Annotation.Root({ answer: Annotation<string>() });

function buildGraph(saver: MongoDBSaver) {
  return new StateGraph(State)
    .addNode('ask', () => ({ answer: interrupt('confirm?') as string }))
    .addEdge(START, 'ask')
    .addEdge('ask', END)
    .compile({ checkpointer: saver });
}

describe('MongoDBSaver spike', () => {
  const client = new MongoClient(URI);
  const threadId = `spike-${Date.now()}`;
  const config = { configurable: { thread_id: threadId } };

  afterAll(async () => {
    await new MongoDBSaver({ client, dbName: DB }).deleteThread(threadId);
    await client.close();
  });

  it('detects the pause after a simulated restart, then resumes', async () => {
    // "Server" #1: run until interrupt()
    const saver1 = new MongoDBSaver({ client, dbName: DB });
    await saver1.setup();
    await buildGraph(saver1).invoke({}, config);

    // "Server" #2: fresh saver and graph, same database
    const saver2 = new MongoDBSaver({ client, dbName: DB });
    await saver2.setup();
    const graph2 = buildGraph(saver2);

    const snap = await graph2.getState(config);
    console.log('next:', snap.next);
    console.log('interrupts:', snap.tasks.map((t) => t.interrupts));
    expect(snap.tasks.some((t) => t.interrupts?.length > 0)).toBe(true);

    const result = await graph2.invoke(new Command({ resume: 'yes' }), config);
    expect(result.answer).toBe('yes');
  }, 30_000);
});
