/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JevClient } from '../intent/classifiers/jev.client';
import { accountTypeLockRule } from './rules/account-type-lock.rule';
import { futureDataRule } from './rules/future-data.rule';
import { largeAmountRule } from './rules/large-amount.rule';
import { policyFlagRule } from './rules/policy-flag.rule';
import { readOnlyDataRule } from './rules/read-only-data.rule';
import { reminderDateRule } from './rules/reminder-date.rule';
import { unsupportedFeatureRule } from './rules/unsupported-feature.rule';

export interface CapabilityRuleContext {
  intent: string;
  group: string;
  message: string;
  today: string;
  timeZone: string;
  slots?: any;
  user?: {
    baseSalary?: number;
    netIncome?: number;
  };
  config?: {
    allowSalaryChange?: boolean;
    allowDeletes?: boolean;
    largeAmountMultiple?: number;
  };
  jevClient?: JevClient;
}

export interface CapabilityCheckOutcome {
  blocked?: boolean;
  invalid?: boolean;
  reason?: string;
}

@Injectable()
export class CapabilityCheckService {
  constructor(
    @Optional() private readonly config?: ConfigService,
    @Optional() private readonly jevClient?: JevClient,
  ) {}

  async check(context: CapabilityRuleContext): Promise<CapabilityCheckOutcome> {
    const ctx: CapabilityRuleContext = {
      ...context,
      config: {
        allowSalaryChange: this.config?.get<boolean>('ALLOW_SALARY_CHANGE', true),
        allowDeletes: this.config?.get<boolean>('ALLOW_DELETES', true),
        largeAmountMultiple: this.config?.get<number>('LARGE_AMOUNT_MULTIPLE', 6),
        ...context.config,
      },
      jevClient: context.jevClient ?? this.jevClient,
    };

    // 1. Synchronous deterministic code rules first (zero latency)
    const syncRules = [
      futureDataRule,
      reminderDateRule,
      readOnlyDataRule,
      accountTypeLockRule,
      largeAmountRule,
      policyFlagRule,
    ];

    for (const rule of syncRules) {
      const res = rule(ctx);
      if (res?.blocked || res?.invalid) {
        return res;
      }
    }

    // 2. Semantic boundary rule (checks out-of-scope & Jev Noul if applicable)
    const asyncRes = await unsupportedFeatureRule(ctx);
    if (asyncRes?.blocked || asyncRes?.invalid) {
      return asyncRes;
    }

    return { blocked: false, invalid: false };
  }
}
