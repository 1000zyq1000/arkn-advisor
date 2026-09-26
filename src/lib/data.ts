/** 数据集加载：当前唯一来源是内置合成样例数据。 */
import type { Dataset, MaterialInfo, StageInfo, EvolutionCost, OperBoxEntry } from './types';
import sampleMaterials from '../data/sample-materials.json';
import sampleOperators from '../data/sample-operators.json';
import sampleEvolutionCosts from '../data/sample-evolution-costs.json';
import sampleStages from '../data/sample-stages.json';

interface RawMaterials {
  _meta?: { source?: string; note?: string };
  materials: Omit<MaterialInfo, never>[];
}
interface RawOperators {
  _meta?: { source?: string; note?: string };
  operators: import('./types').OperatorInfo[];
}
interface RawStages {
  _meta?: { source?: string; note?: string };
  stages: Omit<StageInfo, never>[];
}
interface RawEvolutionCosts {
  costs: Record<string, EvolutionCost>;
}

let cached: Dataset | null = null;

/**
 * 返回当前数据集（进程内缓存）。
 * 未来接入真实数据源时，替换此函数的实现即可 —— UI 与核心逻辑不感知数据来源。
 */
export function loadDataset(): Dataset {
  if (cached) return cached;

  const mats = sampleMaterials as RawMaterials;
  const materials: Record<string, MaterialInfo> = {};
  for (const m of mats.materials) {
    materials[m.id] = m;
  }

  const ops = sampleOperators as RawOperators;
  const stages = sampleStages as RawStages;
  const evolutionCosts = (sampleEvolutionCosts as unknown as RawEvolutionCosts).costs;

  const isSample = mats._meta?.source === 'SYNTHETIC_SAMPLE';

  cached = {
    materials,
    operators: ops.operators,
    evolutionCosts,
    stages: stages.stages,
    isSample,
    metaNote: mats._meta?.note ?? '',
  };
  return cached;
}

/** 供测试重置缓存 */
export function resetDatasetCache(): void {
  cached = null;
}

/**
 * 将「材料名 → 数量」的库存表转换为「材料ID → 数量」。
 * 无法识别的材料名会归入 unknownNames 返回（由 UI 提示，不静默丢弃）。
 */
export function depotByNameToIds(
  byName: Record<string, number>,
  dataset: Dataset,
): { depot: Record<string, number>; unknownNames: string[] } {
  const nameToId = new Map<string, string>();
  for (const mat of Object.values(dataset.materials)) nameToId.set(mat.name, mat.id);
  const depot: Record<string, number> = {};
  const unknownNames: string[] = [];
  for (const [key, count] of Object.entries(byName)) {
    // 键可以是材料名，也可以直接是材料 ID
    const id = nameToId.has(key) ? nameToId.get(key)! : key;
    if (!dataset.materials[id]) {
      unknownNames.push(key);
      continue;
    }
    depot[id] = (depot[id] ?? 0) + count;
  }
  return { depot, unknownNames };
}

/** 示例 box（与样例数据集配套，用于一键演示；name 由键名补充） */
export const SAMPLE_BOX: Record<string, Omit<OperBoxEntry, 'name'>> = {
  芬: { elite: 1, level: 50 },
  讯使: { elite: 0, level: 30 },
  克洛丝: { elite: 1, level: 55 },
  安赛尔: { elite: 1, level: 45 },
  玫兰莎: { elite: 1, level: 50 },
  炎熔: { elite: 1, level: 50 },
  德克萨斯: { elite: 1, level: 60 },
  桃金娘: { elite: 1, level: 50 },
  慕斯: { elite: 1, level: 50 },
  苏苏洛: { elite: 0, level: 40 },
  阿米娅: { elite: 1, level: 70 },
};

/** 示例库存（材料名 → 数量，配合样例数据集） */
export const SAMPLE_DEPOT_BY_NAME: Record<string, number> = {
  源岩: 20,
  固源岩: 4,
  异铁: 15,
  糖: 10,
  酮凝集: 12,
  '技巧概要·卷一': 30,
  '技巧概要·卷二': 6,
  龙门币: 50000,
};
