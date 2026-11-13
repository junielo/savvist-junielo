/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ObservabilityService {
  private userMessage = '';
  private nodes: Record<string, any> = {};
  private lastNodeKey: string | null = null;
  private customLogFilePath: string | null = null;

  setLogFilePath(filePath: string | null): void {
    this.customLogFilePath = filePath;
  }

  // PascalCase methods as requested
  SetUserMessage(message: string): void {
    this.userMessage = message;
  }

  SetExecutedNode(node: string): void {
    this.lastNodeKey = node;
    if (!this.nodes[node]) {
      this.nodes[node] = [];
    }
  }

  SetLLMCall(name: string, value: any): void {
    const targetKey = this.lastNodeKey || 'default';
    if (!this.nodes[targetKey] || Array.isArray(this.nodes[targetKey])) {
      this.nodes[targetKey] = { toolCalls: [], llmCalls: [], llmToolCalls: [] };
    }
    if (!this.nodes[targetKey].llmCalls) {
      this.nodes[targetKey].llmCalls = [];
    }
    this.nodes[targetKey].llmCalls.push({ name, value });
  }

  SetToolCall(name: string, value: any): void {
    const targetKey = this.lastNodeKey || 'default';
    if (!this.nodes[targetKey] || Array.isArray(this.nodes[targetKey])) {
      this.nodes[targetKey] = { toolCalls: [], llmCalls: [], llmToolCalls: [] };
    }
    if (!this.nodes[targetKey].toolCalls) {
      this.nodes[targetKey].toolCalls = [];
    }
    this.nodes[targetKey].toolCalls.push({ name, value });
  }

  SetLLMToolCall(name: string, value: any): void {
    const targetKey = this.lastNodeKey || 'default';
    if (!this.nodes[targetKey] || Array.isArray(this.nodes[targetKey])) {
      this.nodes[targetKey] = { toolCalls: [], llmCalls: [], llmToolCalls: [] };
    }
    if (!this.nodes[targetKey].llmToolCalls) {
      this.nodes[targetKey].llmToolCalls = [];
    }
    this.nodes[targetKey].llmToolCalls.push({ name, value });
  }

  SetResponse(response: string): void {
    const logEntry = {
      userMessage: this.userMessage,
      nodes: this.nodes,
      response,
      timestamp: new Date().toISOString(),
    };

    const srcDirPath = path.join(process.cwd(), 'apps/savvist-backend/src/app/modules/chat/agent/observability');
    let dirPath = __dirname;
    if (fs.existsSync(path.dirname(srcDirPath))) {
      dirPath = srcDirPath;
    }
    const filePath = this.customLogFilePath ?? path.join(dirPath, 'logs.json');

    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      let logs: any[] = [];
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        if (fileContent.trim()) {
          const parsed = JSON.parse(fileContent);
          if (Array.isArray(parsed)) {
            logs = parsed;
          }
        }
      }

      logs.push(logEntry);
      fs.writeFileSync(filePath, JSON.stringify(logs, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to write observability logs:', error);
    }
  }

  // camelCase aliases for NestJS conventions
  setUserMessage(message: string): void {
    this.SetUserMessage(message);
  }

  setExecutedNode(node: string): void {
    this.SetExecutedNode(node);
  }

  setLLMCall(name: string, value: any): void {
    this.SetLLMCall(name, value);
  }

  llmCall(name: string, value: any): void {
    this.SetLLMCall(name, value);
  }

  setToolCall(name: string, value: any): void {
    this.SetToolCall(name, value);
  }

  toolCall(name: string, value: any): void {
    this.SetToolCall(name, value);
  }

  setLLMToolCall(name: string, value: any): void {
    this.SetLLMToolCall(name, value);
  }

  llmToolCall(name: string, value: any): void {
    this.SetLLMToolCall(name, value);
  }

  setResponse(response: string): void {
    this.SetResponse(response);
  }

  reset(): void {
    this.userMessage = '';
    this.nodes = {};
    this.lastNodeKey = null;
  }
}
