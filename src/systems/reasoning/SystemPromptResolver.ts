// src/systems/reasoning/SystemPromptResolver.ts
import { SystemPromptResolver as ISystemPromptResolver } from '../../core/interfaces';
import { SystemPromptsRegistry, SystemPromptOverride, SystemPromptMergeStrategy } from '../../types';
import { PromptManager } from './PromptManager';
import { Logger } from '../../utils/logger';

function applyStrategy(base: string, addition: string, strategy: SystemPromptMergeStrategy | undefined): string {
  const s = strategy || 'append';
  switch (s) {
    case 'prepend':
      return `${addition}\n\n${base}`;
    case 'replace':
      return addition;
    case 'append':
    default:
      return `${base}\n\n${addition}`;
  }
}

function normalizeOverride(input?: string | SystemPromptOverride): SystemPromptOverride | undefined {
  if (!input) return undefined;
  if (typeof input === 'string') {
    return { content: input, strategy: 'append' };
  }
  return input;
}

export class SystemPromptResolver implements ISystemPromptResolver {
  private readonly registry?: SystemPromptsRegistry;
  private readonly promptManager: PromptManager;

  constructor(promptManager: PromptManager, registry?: SystemPromptsRegistry) {
    this.promptManager = promptManager;
    this.registry = registry;
  }

  async resolve(input: { base: string; instance?: string | SystemPromptOverride; thread?: string | SystemPromptOverride; call?: string | SystemPromptOverride; }, traceId?: string): Promise<string> {
    let finalPrompt = input.base;

    const levels: Array<{ src: string; ov?: SystemPromptOverride }> = [
      { src: 'instance', ov: normalizeOverride(input.instance) },
      { src: 'thread', ov: normalizeOverride(input.thread) },
      { src: 'call', ov: normalizeOverride(input.call) },
    ];

    for (const lvl of levels) {
      const ov = lvl.ov;
      if (!ov) continue;

      let rendered = '';
      // Tag-based preset
      if (ov.tag && this.registry?.specs?.[ov.tag]) {
        const spec = this.registry.specs[ov.tag];
        const variables = { ...(spec.defaultVariables || {}), ...(ov.variables || {}) };
        rendered = this.renderTemplate(spec.template, variables);
        finalPrompt = applyStrategy(finalPrompt, rendered, ov.strategy || spec.mergeStrategy || 'append');
        Logger.debug?.(`[${traceId || 'no-trace'}] Applied system prompt tag '${ov.tag}' with strategy '${ov.strategy || spec.mergeStrategy || 'append'}'.`);
      }
      // Freeform content
      else if (ov.content) {
        rendered = ov.content;
        finalPrompt = applyStrategy(finalPrompt, rendered, ov.strategy || 'append');
        Logger.debug?.(`[${traceId || 'no-trace'}] Applied freeform system prompt with strategy '${ov.strategy || 'append'}'.`);
      }
      // No-op if neither tag nor content
    }

    return finalPrompt;
  }

  private renderTemplate(template: string, variables: Record<string, any>): string {
    // Replace fragments first: {{fragment:name}}
    const withFragments = template.replace(/\{\{\s*fragment:([^}]+)\s*\}\}/g, (_m, name) => {
      try {
        return this.promptManager.getFragment(String(name).trim());
      } catch {
        return '';
      }
    });
    // Replace simple variables: {{var}}
    return withFragments.replace(/\{\{\s*([^}:]+)\s*\}\}/g, (_m, key) => {
      const v = variables[String(key).trim()];
      return v !== undefined ? String(v) : '';
    });
  }
}


