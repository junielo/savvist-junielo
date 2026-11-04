import 'dotenv/config';
import { buildGraph } from './agent.graph';
import { JevClient } from '../intent/classifiers/jev.client';
import { JevIntentClassifier } from '../intent/classifiers/jev.classifier';

if (!process.env['TYPESAFE_API_KEY']) {
  throw new Error('TYPESAFE_API_KEY is not set (check the env file used by langgraph.json)');
}

const jev = new JevClient({
  model: process.env['JEV_MODEL'] ?? 'jev-latest',
  timeoutMs: Number(5000),
});

const classifier = new JevIntentClassifier(jev, {
  minConfidence: Number(0.6),
  minMargin: Number(0.15),
});

export const graph = buildGraph({ classifier });