/** 培养需求计算：根据目标干员与目标阶段，汇总所需材料。 */
import type { MaterialCount, OperatorInfo, Dataset } from './types';

export interface DemandTarget {
  info: OperatorInfo;
  /** 目标精英化阶段（1 或 2） */
  targetPhase: 1 | 2;
}

function addCount(map: Map<string, number>, materialId: string, count: number): void {
  map.set(materialId, (map.get(materialId) ?? 0) + count);
}

/**
 * 汇总养成需求。
 * 目标精二 = 先精一再精二，因此累加 phase1 + phase2 的全部材料。
 * 干员缺少消耗数据时抛出错误（数据集完整性问题）。
 */
export function buildDemand(targets: DemandTarget[], dataset: Dataset): MaterialCount[] {
  const merged = new Map<string, number>();
  for (const { info, targetPhase } of targets) {
    const cost = dataset.operatorCosts[info.name];
    if (!cost) {
      throw new Error(`数据集缺少干员「${info.name}」的精英化消耗数据。`);
    }
    for (const mc of cost.phase1) addCount(merged, mc.materialId, mc.count);
    if (targetPhase === 2) {
      for (const mc of cost.phase2) addCount(merged, mc.materialId, mc.count);
    }
  }
  return [...merged.entries()]
    .map(([materialId, count]) => ({ materialId, count }))
    .sort((a, b) => a.materialId.localeCompare(b.materialId));
}
