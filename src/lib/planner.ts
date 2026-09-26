/**
 * 刷图规划：材料缺口（扣除库存）→ 建议合成 → 推荐掉落关卡（按理智效率）。
 *
 * v1 语义（有明确文档化的近似，见 README 路线图）：
 * - 只做单级合成建议（不链式展开到更低级材料）；
 * - 合成消耗按“低级材料在先”的贪心顺序处理，只使用现有库存；
 * - 关卡推荐 = 该材料期望掉落“每单位理智产出”最高的关卡。
 */
import type {
  Dataset,
  Depot,
  MaterialCount,
  PlanLine,
  PlanResult,
  StageSummary,
} from './types';

export interface PlanParams {
  demand: MaterialCount[];
  depot: Depot;
  dataset: Dataset;
}

/** 在关卡集合中为材料挑选“每单位理智期望产出”最高的关卡 */
export function bestStageFor(
  materialId: string,
  dataset: Dataset,
): { stage: import('./types').StageInfo; expectPerRun: number } | null {
  let best: { stage: import('./types').StageInfo; expectPerRun: number } | null = null;
  let bestRate = 0;
  for (const stage of dataset.stages) {
    for (const drop of stage.drops) {
      if (drop.materialId !== materialId || drop.expectPerRun <= 0) continue;
      const rate = drop.expectPerRun / stage.sanity;
      if (rate > bestRate) {
        bestRate = rate;
        best = { stage, expectPerRun: drop.expectPerRun };
      }
    }
  }
  return best;
}

export function planFarming({ demand, depot, dataset }: PlanParams): PlanResult {
  // 按材料等级升序处理：先决定低级材料是否被合成消耗，再处理高级材料
  const order = [...demand].sort(
    (a, b) =>
      (dataset.materials[a.materialId]?.tier ?? 99) -
        (dataset.materials[b.materialId]?.tier ?? 99) ||
      a.materialId.localeCompare(b.materialId),
  );

  const working: Depot = { ...depot };
  const lines: PlanLine[] = [];
  const warnings: string[] = [];

  for (const req of order) {
    const mat = dataset.materials[req.materialId];
    if (!mat) {
      warnings.push(`需求中的材料 ${req.materialId} 不在数据集中，已跳过。`);
      continue;
    }
    const need = req.count;
    const have = Math.max(0, working[req.materialId] ?? 0);
    const usable = Math.min(have, need);
    working[req.materialId] = have - usable;
    let remaining = need - usable;

    // 合成建议：仅当仍有缺口且该材料存在配方
    let craftSuggestion = 0;
    if (remaining > 0 && mat.craft) {
      let craftable = remaining;
      for (const input of mat.craft.inputs) {
        const owned = working[input.materialId] ?? 0;
        craftable = Math.min(craftable, Math.floor(owned / input.count));
      }
      craftable = Math.max(0, craftable);
      if (craftable > 0) {
        craftSuggestion = craftable;
        for (const input of mat.craft.inputs) {
          working[input.materialId] = (working[input.materialId] ?? 0) - input.count * craftable;
        }
        remaining -= craftable;
      }
    }

    const toFarm = remaining;
    let stageCode: string | undefined;
    let runs: number | undefined;
    let sanity: number | undefined;
    if (toFarm > 0) {
      const best = bestStageFor(req.materialId, dataset);
      if (best) {
        stageCode = best.stage.code;
        runs = Math.ceil(toFarm / best.expectPerRun);
        sanity = runs * best.stage.sanity;
      } else {
        warnings.push(`材料「${mat.name}」在当前数据集的关卡中没有掉落来源，只能靠合成或其它途径补齐。`);
      }
    }

    lines.push({
      materialId: req.materialId,
      name: mat.name,
      need,
      have,
      craftSuggestion,
      toFarm,
      stageCode,
      runs,
      sanity,
    });
  }

  // 汇总关卡跑图量
  const stageMap = new Map<string, StageSummary>();
  for (const line of lines) {
    if (line.stageCode && line.runs && line.sanity) {
      const prev = stageMap.get(line.stageCode) ?? { code: line.stageCode, runs: 0, sanity: 0 };
      prev.runs += line.runs;
      prev.sanity += line.sanity;
      stageMap.set(line.stageCode, prev);
    }
  }
  const stageSummary = [...stageMap.values()].sort((a, b) => b.sanity - a.sanity);
  const totalSanity = stageSummary.reduce((acc, s) => acc + s.sanity, 0);

  return { lines, stageSummary, totalSanity, warnings };
}
