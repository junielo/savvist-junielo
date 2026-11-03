apps/savvist-backend/src/app/
├── config/
│   ├── configuration.ts              # MODIFY: add agent block (jev, gemini, allowDeletes, allowSalaryChange)
│   └── env.validation.ts             # MODIFY: JEV_API_KEY, GEMINI_API_KEY, flags
└── modules/
    └── chat/
        ├── chat.module.ts            # MODIFY: import AgentModule
        ├── conversations/            # unchanged
        ├── messages/                 # unchanged
        └── agent/
            ├── agent.module.ts       # wires everything below; imports domain modules
            ├── agent.service.ts      # ENTRY POINT: run(conversationId, message), resume(), stream
            │
            ├── graph/                # the LangGraph workflow itself
            │   ├── agent.graph.ts    # builds StateGraph, adds nodes + edges, compiles with checkpointer
            │   ├── agent.state.ts    # state schema (messages, intentResult, pending_action, awaiting_clarification)
            │   ├── agent.routers.ts  # conditional-edge functions (route by group, by capability result)
            │   └── nodes/            # one file per node, each a small pure-ish function
            │       ├── load-context.node.ts        # fetch previous message, userId, today in Asia/Manila
            │       ├── state-guard.node.ts         # pending_action? -> group A, no model call
            │       ├── classify-intent.node.ts     # calls the IntentClassifier interface
            │       ├── extract-slots.node.ts       # Gemini: amount, account, targetDay, standaloneQuery
            │       ├── capability-check.node.ts    # group F: blocked / invalid / allowed
            │       ├── clarify.node.ts             # unknown or needsClarification
            │       ├── blocked.node.ts             # explains why a request can't be done
            │       ├── read-data.node.ts           # groups C and E data fetch
            │       ├── analyze.node.ts             # affordability, what_if, advice (compute only)
            │       ├── confirm-first.node.ts       # sets pending_action, calls interrupt()
            │       ├── resolve-confirmation.node.ts# confirm / deny / cancel / correction
            │       ├── execute-write.node.ts       # only reachable after confirm
            │       └── respond.node.ts             # Gemini writes the user-facing reply
            │
            ├── intent/               # classification, independent of the graph
            │   ├── intent.types.ts           # IntentGroup, Intent, Entity, IntentResult, ClassifyContext
            │   ├── intent.taxonomy.ts        # intent -> group, intent -> entity
            │   ├── risk-tier.ts              # code-only risk map (never from the model)
            │   ├── state-guards.ts           # confirm without pending -> follow_up, etc.
            │   ├── scores-to-result.ts       # Jev yes/no scores -> threshold -> IntentResult
            │   ├── intent-classifier.interface.ts  # classify(message, context) => IntentResult
            │   ├── intent-classifier.token.ts      # DI token so implementations can be swapped
            │   └── classifiers/
            │       ├── jev.classifier.ts     # primary
            │       ├── jev.client.ts         # HTTP adapter (TODO until API shape is confirmed)
            │       ├── jev.questions.ts      # one question per intent
            │       └── keyword.classifier.ts # baseline for eval comparison
            │
            ├── llm/                  # Gemini only: slots, rewriting, replies
            │   ├── gemini.service.ts
            │   ├── slot-extractor.ts
            │   ├── query-rewriter.ts
            │   ├── reply-writer.ts
            │   └── prompts/
            │       ├── slot-extraction.prompt.ts
            │       ├── standalone-query.prompt.ts
            │       └── reply.prompt.ts
            │
            ├── capability/           # deterministic rules for group F
            │   ├── capability-check.service.ts
            │   └── rules/
            │       ├── read-only-data.rule.ts      # logs, dailyMetrics, allowance
            │       ├── future-date.rule.ts
            │       ├── account-type-lock.rule.ts
            │       ├── unsupported-feature.rule.ts
            │       └── policy-flags.rule.ts        # delete / baseSalary via config
            │
            ├── tools/                # thin adapters over existing NestJS services
            │   ├── read.tools.ts                   # balances, metrics, expenses, wishlist, logs, profile
            │   ├── write.tools.ts                  # one function per write intent
            │   └── tool-registry.ts                # intent -> tool function
            │
            ├── persistence/
            │   └── mongo-checkpointer.provider.ts  # MongoDBSaver, reusing the Mongoose connection if possible
            │
            └── eval/
                ├── eval-intents.ts           # accuracy, group accuracy, confusions, write-boundary errors (must be 0)
                ├── cases.jsonl               # labeled messages, including "Yes" after different assistant messages
                └── seed-cases.ts