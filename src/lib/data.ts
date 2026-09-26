/**
 * 数据集加载：内置真实游戏数据（默认）与样例演示数据两个来源。
 *
 * - 真实数据（real-*.json）：由 scripts/build-real-dataset.mjs 从游戏数据提取仓库
 *   （Kengxxiao/ArknightsGameData，来源与 blob SHA 核验记录见 NOTICE.md）结构转换生成，
 *   未修改、未虚构任何数值；期望掉率不在游戏数据中（为 0），掉率来源接入前刷取规划受限。
 * - 样例数据（sample-*.json）：全部标注 SYNTHETIC_SAMPLE 的合成数值，仅用于功能演示；
 *   其按稀有度的消耗模板在加载时合成为按干员的 operatorCosts。
 *
 * UI 顶部的数据源切换只改变 kind，核心逻辑不感知数据来源。
 */
import type {
  ChallengeStage,
  Dataset,
  DatasetKind,
  MaterialInfo,
  StageInfo,
  EvolutionCost,
  OperBoxEntry,
} from './types';
import sampleMaterials from '../data/sample-materials.json';
import sampleOperators from '../data/sample-operators.json';
import sampleEvolutionCosts from '../data/sample-evolution-costs.json';
import sampleStages from '../data/sample-stages.json';
import sampleChallengeStages from '../data/sample-challenge-stages.json';
import realMaterials from '../data/real-materials.json';
import realOperators from '../data/real-operators.json';
import realOperatorCosts from '../data/real-operator-costs.json';
import realStages from '../data/real-stages.json';

interface RawMaterials {
  _meta?: { source?: string; note?: string };
  materials: MaterialInfo[];
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
interface RawChallenges {
  challengeStages: ChallengeStage[];
}
interface RawOperatorCosts {
  costs: Record<string, EvolutionCost>;
}

const caches: Partial<Record<DatasetKind, Dataset>> = {};

function buildFromMaterials(mats: RawMaterials): Record<string, MaterialInfo> {
  const materials: Record<string, MaterialInfo> = {};
  for (const m of mats.materials) {
    materials[m.id] = m;
  }
  return materials;
}

function buildSampleDataset(): Dataset {
  const mats = sampleMaterials as RawMaterials;
  const ops = sampleOperators as RawOperators;
  const stages = sampleStages as RawStages;
  const evolutionCosts = (sampleEvolutionCosts as unknown as RawEvolutionCosts).costs;
  const challengeStages = (sampleChallengeStages as unknown as RawChallenges).challengeStages;

  // 样例数据保持"按稀有度模板"的旧语义：在加载时合成为按干员的 operatorCosts，
  // 使两种数据源在 demand 层共用同一接口。
  const operatorCosts: Record<string, EvolutionCost> = {};
  for (const op of ops.operators) {
    operatorCosts[op.name] = evolutionCosts[String(op.rarity)] ?? { phase1: [], phase2: [] };
  }

  return {
    materials: buildFromMaterials(mats),
    operators: ops.operators,
    operatorCosts,
    stages: stages.stages,
    challengeStages,
    isSample: mats._meta?.source === 'SYNTHETIC_SAMPLE',
    metaNote: mats._meta?.note ?? '',
  };
}

function buildRealDataset(): Dataset {
  const mats = realMaterials as RawMaterials;
  const ops = realOperators as RawOperators;
  const stages = realStages as RawStages;
  const operatorCosts = (realOperatorCosts as unknown as RawOperatorCosts).costs;
  // 挑战型关卡的机制标注是编辑性数据，尚无已核实的真实来源 —— 如实留空，
  // 「按目标关卡」推荐在真实数据集下暂不可用（UI 有空态提示）。
  const challengeStages: ChallengeStage[] = [];

  return {
    materials: buildFromMaterials(mats),
    operators: ops.operators,
    operatorCosts,
    stages: stages.stages,
    challengeStages,
    isSample: mats._meta?.source === 'GAME_DATA' ? false : true,
    metaNote: mats._meta?.note ?? '',
  };
}

/**
 * 返回指定来源的数据集（按来源进程内缓存）。
 * kind：'real'（默认，真实游戏数据）| 'sample'（样例演示数据）。
 */
export function loadDataset(kind: DatasetKind = 'real'): Dataset {
  const hit = caches[kind];
  if (hit) return hit;
  const dataset = kind === 'sample' ? buildSampleDataset() : buildRealDataset();
  caches[kind] = dataset;
  return dataset;
}

/** 供测试重置缓存 */
export function resetDatasetCache(): void {
  caches.real = undefined;
  caches.sample = undefined;
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

/** 示例 box（用于一键演示；干员在两种数据集中均存在；name 由键名补充） */
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

/** 示例库存（材料名 → 数量；材料名在两种数据集中均存在） */
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
