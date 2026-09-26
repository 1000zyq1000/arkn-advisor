/**
 * 刷图规划（v0.3：链式合成）。
 *
 * 语义（详见 README「评分与规划语义」）：
 * - 需求按材料等级升序处理，库存优先抵扣；
 * - 对每个缺口比较两条路线的理智成本：直接刷取 vs 合成获得（原料缺口递归求解，可多级展开）；
 * - 择优执行，同价时优先直接刷取；路线估算基于当前库存快照（贪心近似，非全局最优）；
 * - 为合成供料而刷取/合成的行会标注 supportFor（为哪个材料供料）。
 */
import type {
  Dataset,
  Depot,
  MaterialCount,
  PlanLine,
  PlanResult,
  StageInfo,
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
): { stage: StageInfo; expectPerRun: number } | null {
  let best: { stage: StageInfo; expectPerRun: number } | null = null;
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

interface FarmAction {
  materialId: string;
  count: number;
  stageCode: string;
  runs: number;
  sanity: number;
}

interface CraftAction {
  materialId: string;
  count: number;
}

interface AcquireResult {
  sanity: number;
  farm: FarmAction[];
  craft: CraftAction[];
  stockUsed: Record<string, number>;
  /** 原料材料ID -> 为其合成的材料ID */
  feeds: Record<string, string>;
  warnings: string[];
  feasible: boolean;
}

/** 库存的可替换引用：合成路线在克隆上探索，择优后写回 */
interface StockRef {
  stock: Depot;
}

const MAX_DEPTH = 8;

function acquire(
  materialId: string,
  count: number,
  stockRef: StockRef,
  dataset: Dataset,
  depth: number,
): AcquireResult {
  const result: AcquireResult = {
    sanity: 0,
    farm: [],
    craft: [],
    stockUsed: {},
    feeds: {},
    warnings: [],
    feasible: true,
  };
  if (count <= 0) return result;

  const mat = dataset.materials[materialId];
  const stock = stockRef.stock;

  // 1. 库存优先抵扣（两条路线都受益，先扣）
  const fromStock = Math.min(count, stock[materialId] ?? 0);
  if (fromStock > 0) {
    stock[materialId] = (stock[materialId] ?? 0) - fromStock;
    result.stockUsed[materialId] = fromStock;
  }
  const remaining = count - fromStock;
  if (remaining <= 0) return result;

  // 2. 路线 A：直接刷取（纯估算，不产生副作用）
  const best = bestStageFor(materialId, dataset);
  const farmRuns = best ? Math.ceil(remaining / best.expectPerRun) : 0;
  const farmSanity = best ? farmRuns * best.stage.sanity : Number.POSITIVE_INFINITY;

  // 3. 路线 B：合成（在库存克隆上探索，择优后才写回）
  let craftResult: AcquireResult | null = null;
  let craftStock: Depot | null = null;
  if (mat?.craft && depth < MAX_DEPTH) {
    const clone: Depot = { ...stock };
    const sub: AcquireResult = {
      sanity: 0,
      farm: [],
      craft: [],
      stockUsed: {},
      feeds: {},
      warnings: [],
      feasible: true,
    };
    let ok = true;
    for (const input of mat.craft.inputs) {
      const part = acquire(input.materialId, input.count * remaining, { stock: clone }, dataset, depth + 1);
      sub.sanity += part.sanity;
      sub.farm.push(...part.farm);
      sub.craft.push(...part.craft);
      for (const [k, v] of Object.entries(part.stockUsed)) {
        sub.stockUsed[k] = (sub.stockUsed[k] ?? 0) + v;
      }
      for (const [k, v] of Object.entries(part.feeds)) sub.feeds[k] = v;
      sub.warnings.push(...part.warnings);
      if (!part.feasible) ok = false;
    }
    if (ok) {
      sub.craft.push({ materialId, count: remaining });
      for (const input of mat.craft.inputs) sub.feeds[input.materialId] = materialId;
      craftResult = sub;
      craftStock = clone;
    }
  }

  // 4. 择优：同价优先直接刷取
  if (best && farmSanity <= (craftResult?.sanity ?? Number.POSITIVE_INFINITY)) {
    result.sanity = farmSanity;
    result.farm.push({
      materialId,
      count: remaining,
      stageCode: best.stage.code,
      runs: farmRuns,
      sanity: farmSanity,
    });
    return result;
  }
  if (craftResult && craftStock) {
    stockRef.stock = craftStock;
    return craftResult;
  }
  if (best) {
    // 有掉落来源但合成路线不可行（或达到递归上限）
    result.sanity = farmSanity;
    result.farm.push({
      materialId,
      count: remaining,
      stageCode: best.stage.code,
      runs: farmRuns,
      sanity: farmSanity,
    });
    return result;
  }
  result.feasible = false;
  result.warnings.push(`材料「${mat?.name ?? materialId}」既无掉落来源，也无法通过合成获得。`);
  return result;
}

export function planFarming({ demand, depot, dataset }: PlanParams): PlanResult {
  const stockRef: StockRef = { stock: { ...depot } };
  const warnings: string[] = [];

  const order = [...demand].sort(
    (a, b) =>
      (dataset.materials[a.materialId]?.tier ?? 99) -
        (dataset.materials[b.materialId]?.tier ?? 99) ||
      a.materialId.localeCompare(b.materialId),
  );

  const demandSet = new Map<string, number>();
  const total: AcquireResult = {
    sanity: 0,
    farm: [],
    craft: [],
    stockUsed: {},
    feeds: {},
    warnings: [],
    feasible: true,
  };

  for (const req of order) {
    const mat = dataset.materials[req.materialId];
    if (!mat) {
      warnings.push(`需求中的材料 ${req.materialId} 不在数据集中，已跳过。`);
      continue;
    }
    if (req.count <= 0) continue; // 数量为 0 的需求不产生行
    demandSet.set(req.materialId, (demandSet.get(req.materialId) ?? 0) + req.count);
    const sub = acquire(req.materialId, req.count, stockRef, dataset, 0);
    total.sanity += sub.sanity;
    total.farm.push(...sub.farm);
    total.craft.push(...sub.craft);
    for (const [k, v] of Object.entries(sub.stockUsed)) {
      total.stockUsed[k] = (total.stockUsed[k] ?? 0) + v;
    }
    for (const [k, v] of Object.entries(sub.feeds)) total.feeds[k] = v;
    total.warnings.push(...sub.warnings);
  }

  // 汇总为逐材料行
  interface Row extends PlanLine {
    _tier: number;
    _supportFor: Set<string>;
  }
  const rows = new Map<string, Row>();
  const ensure = (id: string): Row => {
    let row = rows.get(id);
    if (!row) {
      row = {
        materialId: id,
        name: dataset.materials[id]?.name ?? id,
        need: 0,
        have: 0,
        craftSuggestion: 0,
        toFarm: 0,
        stageCode: undefined,
        runs: undefined,
        sanity: undefined,
        supportFor: undefined,
        _tier: dataset.materials[id]?.tier ?? 99,
        _supportFor: new Set<string>(),
      };
      rows.set(id, row);
    }
    return row;
  };

  for (const [id, n] of demandSet) ensure(id)!.need += n;
  for (const [id, n] of Object.entries(total.stockUsed)) ensure(id)!.have += n;
  for (const f of total.farm) {
    const row = ensure(f.materialId)!;
    row.toFarm += f.count;
    row.stageCode = f.stageCode;
    row.runs = (row.runs ?? 0) + f.runs;
    row.sanity = (row.sanity ?? 0) + f.sanity;
  }
  for (const c of total.craft) ensure(c.materialId)!.craftSuggestion += c.count;
  for (const [from, to] of Object.entries(total.feeds)) ensure(from)!._supportFor.add(to);

  const lines: PlanLine[] = [...rows.values()]
    .sort((a, b) => a._tier - b._tier || a.materialId.localeCompare(b.materialId))
    .map((row) => ({
      materialId: row.materialId,
      name: row.name,
      need: row.need,
      have: row.have,
      craftSuggestion: row.craftSuggestion,
      toFarm: row.toFarm,
      stageCode: row.stageCode,
      runs: row.runs,
      sanity: row.sanity,
      supportFor: row._supportFor.size > 0 ? [...row._supportFor].sort() : undefined,
    }));

  // 汇总关卡跑图量
  const stageMap = new Map<string, StageSummary>();
  for (const f of total.farm) {
    const prev = stageMap.get(f.stageCode) ?? { code: f.stageCode, runs: 0, sanity: 0 };
    prev.runs += f.runs;
    prev.sanity += f.sanity;
    stageMap.set(f.stageCode, prev);
  }
  const stageSummary = [...stageMap.values()].sort((a, b) => b.sanity - a.sanity);
  const totalSanity = total.sanity;

  return { lines, stageSummary, totalSanity, warnings: [...warnings, ...total.warnings] };
}
