/** 核心领域模型 —— 所有模块共用的类型定义。 */

export const PROFESSIONS = [
  '先锋',
  '近卫',
  '重装',
  '狙击',
  '术师',
  '医疗',
  '辅助',
  '特种',
] as const;

export type Profession = (typeof PROFESSIONS)[number];

/** 精英化阶段：0 = 精零，1 = 精一，2 = 精二 */
export type Elite = 0 | 1 | 2;

/** 材料数量 */
export interface MaterialCount {
  materialId: string;
  count: number;
}

/** 合成配方：inputs 合成产出 1 个该材料（v1 语义，不做链式合成） */
export interface CraftRecipe {
  inputs: MaterialCount[];
}

export interface MaterialInfo {
  id: string;
  name: string;
  tier: number;
  craft?: CraftRecipe;
}

/** 某稀有度的精英化消耗模板（样例数据；真实消耗按干员各有差异） */
export interface EvolutionCost {
  phase1: MaterialCount[];
  phase2: MaterialCount[];
}

export interface OperatorInfo {
  name: string;
  rarity: 1 | 2 | 3 | 4 | 5 | 6;
  profession: Profession;
  tags: string[];
}

export interface StageDrop {
  materialId: string;
  /** 每次通关的期望掉落数（样例数据为虚构值） */
  expectPerRun: number;
}

export interface StageInfo {
  id: string;
  code: string;
  name: string;
  sanity: number;
  drops: StageDrop[];
}

/** 挑战型关卡（用于“目标关卡”推荐；样例数据的机制为演示标注） */
export interface ChallengeStage {
  id: string;
  code: string;
  name: string;
  /** 机制需求，如「需要法伤」「需要治疗续航」；必须在 MECHANIC_AFFINITY 中有定义 */
  mechanics: string[];
}

/** 一次加载完成的完整数据集（当前来自内置样例，未来由适配器提供） */
export interface Dataset {
  materials: Record<string, MaterialInfo>;
  operators: OperatorInfo[];
  /** key 为稀有度数字字符串，如 "6" */
  evolutionCosts: Record<string, EvolutionCost>;
  stages: StageInfo[];
  /** 挑战型关卡（“目标关卡”推荐的数据源） */
  challengeStages: ChallengeStage[];
  /** 数据集是否为内置合成样例（UI 需据此展示提示横幅） */
  isSample: boolean;
  /** 数据集说明（展示在“数据说明”页） */
  metaNote: string;
}

/** 干员 box 中的一条记录 */
export interface OperBoxEntry {
  name: string;
  elite: Elite;
  level: number;
  potential?: number;
}

/** 材料库存：key 为材料 id，value 为数量 */
export type Depot = Record<string, number>;

/** 规划结果中的一行（对应一种材料） */
export interface PlanLine {
  materialId: string;
  name: string;
  need: number;
  have: number;
  /** 建议直接合成的数量（已扣除库存） */
  craftSuggestion: number;
  /** 扣除库存与合成后仍需刷取的数量 */
  toFarm: number;
  /** 推荐关卡（按理智效率最优） */
  stageCode?: string;
  runs?: number;
  sanity?: number;
  /** 本材料的刷取/合成是为哪些材料供料（链式合成时出现） */
  supportFor?: string[];
}

export interface StageSummary {
  code: string;
  runs: number;
  sanity: number;
}

export interface PlanResult {
  lines: PlanLine[];
  stageSummary: StageSummary[];
  totalSanity: number;
  warnings: string[];
}

/** 推荐结果中的一条 */
export interface Recommendation {
  operator: OperatorInfo;
  score: number;
  valueScore: number;
  costFactor: number;
  reasons: string[];
}

export interface GoalPreset {
  id: string;
  label: string;
  description: string;
  classWeights: Partial<Record<Profession, number>>;
  tagWeights: Record<string, number>;
}

export interface BoxAnalysis {
  /** 高练度干员（精二，或精一且等级 ≥ 45） */
  raised: OperatorInfo[];
  professionCounts: Partial<Record<Profession, number>>;
  missingProfessions: Profession[];
  /** 高练度 box 中各标签的出现次数 */
  tagCounts: Record<string, number>;
}
