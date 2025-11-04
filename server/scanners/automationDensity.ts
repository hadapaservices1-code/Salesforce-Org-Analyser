import { FlowMetadata, TriggerMetadata, ValidationRuleMetadata, MigrationBlocker } from '@/lib/types';

export function detectAutomationDensityBlockers(
  flows: FlowMetadata[],
  triggers: TriggerMetadata[],
  validationRules: ValidationRuleMetadata[]
): MigrationBlocker[] {
  const blockers: MigrationBlocker[] = [];

  // Count automations per object
  const objectAutomations: Record<string, { flows: number; triggers: number; rules: number }> = {};

  for (const flow of flows) {
    // Flow objects are harder to determine without metadata describe
    // This is a simplified check
  }

  for (const trigger of triggers) {
    if (!objectAutomations[trigger.object]) {
      objectAutomations[trigger.object] = { flows: 0, triggers: 0, rules: 0 };
    }
    objectAutomations[trigger.object].triggers++;
  }

  for (const rule of validationRules) {
    if (!objectAutomations[rule.object]) {
      objectAutomations[rule.object] = { flows: 0, triggers: 0, rules: 0 };
    }
    objectAutomations[rule.object].rules++;
  }

  for (const [object, counts] of Object.entries(objectAutomations)) {
    const total = counts.triggers + counts.rules;
    if (total > 10) {
      blockers.push({
        type: 'automation_density',
        severity: total > 20 ? 'high' : 'medium',
        object,
        message: `Object ${object} has high automation density: ${counts.triggers} triggers, ${counts.rules} validation rules.`,
        recommendation: `Review automation logic for consolidation opportunities. High automation density can cause performance issues and maintenance challenges.`,
      });
    }
  }

  return blockers;
}
