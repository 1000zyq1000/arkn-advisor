/**
 * 培养推荐引擎（v1 启发式评分）。
 *
 * 评分完全透明：valueScore（价值）÷ costFactor（剩余养成成本），
 * 并给出可读的 reasons。所有权重集中定义在 goals.ts，欢迎通过 PR 调整。
 */
import type {
  BoxAnalysis,
  Dataset,
  GoalPreset,
  OperatorInfo,
  Profession,
  Recommendation,
} from './types';
import { PROFESSIONS } from './types';

const RARITY_BASE: Record<number, number> = {
  6: 5.0,
  5: 3.5,
  4: 2.5,
  3: 1.6,
  2: 1.1,
  1: 1.0,
};

/** 判定“高练度”：精二，或精一且等级 ≥ 45 */
export function isRaised(entry: { elite: number; level: number }): boolean {
  return entry.elite === 2 || (entry.elite === 1 && entry.level >= 45);
}

export function analyzeBox(
  box: Record<string, { elite: number; level: number }>,
  dataset: Dataset,
): BoxAnalysis {
  const raised: OperatorInfo[] = [];
  const professionCounts: Partial<Record<Profession, number>> = {};
  const tagCounts: Record<string, number> = {};

  for (const op of dataset.operators) {
    const entry = box[op.name];
    if (!entry || !isRaised(entry)) continue;
    raised.push(op);
    professionCounts[op.profession] = (professionCounts[op.profession] ?? 0) + 1;
    for (const t of op.tags) tagCounts[t] = (tagCounts[t] ?? 0) + 1;
  }

  const missingProfessions = PROFESSIONS.filter((p) => (professionCounts[p] ?? 0) === 0);
  return { raised, professionCounts, missingProfessions, tagCounts };
}

export function recommend(
  box: Record<string, { elite: number; level: number }>,
  preset: GoalPreset,
  dataset: Dataset,
  topN = 10,
): Recommendation[] {
  const analysis = analyzeBox(box, dataset);
  const results: Recommendation[] = [];

  for (const op of dataset.operators) {
    const entry = box[op.name];
    if (entry && isRaised(entry)) continue; // 已高练度，无需推荐

    const classWeight = preset.classWeights[op.profession] ?? 0.6;
    const tagScore = op.tags.reduce((acc, t) => {
      const weight = preset.tagWeights[t] ?? 0;
      const gap = (analysis.tagCounts[t] ?? 0) === 0 ? 1 : 0.4;
      return acc + weight * gap + 0.05;
    }, 0);

    const valueScore = (RARITY_BASE[op.rarity] ?? 1) * classWeight * (0.7 + tagScore);
    // costFactor：已精一的干员升精二成本更低，得分更高
    const costFactor = entry?.elite === 1 ? 0.65 : 1.0;
    const score = valueScore / costFactor;

    const reasons: string[] = [];
    if (analysis.professionCounts[op.profession] === undefined) {
      reasons.push(`你的高练干员中还没有${op.profession}，补强该职业价值高。`);
    }
    const gapTag = op.tags.find((t) => (analysis.tagCounts[t] ?? 0) === 0);
    if (gapTag) {
      reasons.push(`标签「${gapTag}」在你的高练 box 中为空白。`);
    }
    if (entry?.elite === 1) {
      reasons.push('已精一，升精二的养成成本较低。');
    }
    reasons.push(`「${preset.label}」场景下${op.profession}权重 ${classWeight.toFixed(2)}。`);

    results.push({ operator: op, score, valueScore, costFactor, reasons });
  }

  results.sort((a, b) => b.score - a.score || a.operator.name.localeCompare(b.operator.name));
  return results.slice(0, topN);
}
