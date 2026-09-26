import { describe, expect, it } from 'vitest';
import { depotByNameToIds, loadDataset, resetDatasetCache } from '../src/lib/data';
import { MECHANIC_AFFINITY } from '../src/lib/mechanics';
import { PROFESSIONS } from '../src/lib/types';

/**
 * 样例数据完整性测试：保证所有交叉引用有效。
 * 这是“样例数据也是一等公民”的底线 —— 换成真实数据集时同样适用。
 */
describe('样例数据集完整性', () => {
  const dataset = loadDataset();

  it('明确标注为合成样例数据', () => {
    expect(dataset.isSample).toBe(true);
    expect(dataset.metaNote).toContain('虚构');
  });

  it('干员数量充足且字段合法', () => {
    expect(dataset.operators.length).toBeGreaterThanOrEqual(20);
    const names = dataset.operators.map((o) => o.name);
    expect(new Set(names).size).toBe(names.length);
    for (const op of dataset.operators) {
      expect(op.rarity).toBeGreaterThanOrEqual(1);
      expect(op.rarity).toBeLessThanOrEqual(6);
      expect(PROFESSIONS).toContain(op.profession);
      expect(op.tags.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('稀有度 3–6 都有精英化消耗模板，且引用的材料存在', () => {
    const rarities = new Set(dataset.operators.map((o) => o.rarity));
    for (const r of rarities) {
      const cost = dataset.evolutionCosts[String(r)];
      expect(cost, `缺少 ${r} 星模板`).toBeTruthy();
      for (const mc of [...cost.phase1, ...cost.phase2]) {
        expect(dataset.materials[mc.materialId], `材料 ${mc.materialId} 不存在`).toBeTruthy();
        expect(mc.count).toBeGreaterThan(0);
      }
    }
  });

  it('关卡掉落引用的材料存在，掉率为正', () => {
    const codes = dataset.stages.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const stage of dataset.stages) {
      expect(stage.sanity).toBeGreaterThan(0);
      expect(stage.drops.length).toBeGreaterThan(0);
      for (const drop of stage.drops) {
        expect(dataset.materials[drop.materialId], `材料 ${drop.materialId} 不存在`).toBeTruthy();
        expect(drop.expectPerRun).toBeGreaterThan(0);
      }
    }
  });

  it('合成配方引用低一级材料', () => {
    for (const mat of Object.values(dataset.materials)) {
      if (!mat.craft) continue;
      for (const input of mat.craft.inputs) {
        const low = dataset.materials[input.materialId];
        expect(low, `配方材料 ${input.materialId} 不存在`).toBeTruthy();
        expect(low!.tier, `${mat.name} 的配方材料等级应更低`).toBeLessThan(mat.tier);
        expect(input.count).toBeGreaterThan(0);
      }
    }
  });

  it('样例关卡覆盖所有可合成链的 Tier1 材料与龙门币', () => {
    const farmable = new Set(dataset.stages.flatMap((s) => s.drops.map((d) => d.materialId)));
    for (const mat of Object.values(dataset.materials)) {
      if (mat.tier <= 1 || mat.id === 'gold') {
        expect(farmable.has(mat.id), `${mat.name} 应有掉落来源`).toBe(true);
      }
    }
  });

  it('depotByNameToIds 同时接受材料名与材料 ID 作为键', () => {
    const { depot, unknownNames } = depotByNameToIds(
      { 龙门币: 100, gold: 50, 幻影材料: 1 },
      dataset,
    );
    expect(depot['gold']).toBe(150);
    expect(unknownNames).toEqual(['幻影材料']);
  });

  it('缓存重置后仍加载同一数据集', () => {
    resetDatasetCache();
    const a = loadDataset();
    const b = loadDataset();
    expect(a).toBe(b);
  });

  it('挑战关卡机制均在亲和表中有定义，关卡编号唯一', () => {
    expect(dataset.challengeStages.length).toBeGreaterThanOrEqual(5);
    const codes = dataset.challengeStages.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const stage of dataset.challengeStages) {
      expect(stage.mechanics.length).toBeGreaterThan(0);
      for (const m of stage.mechanics) {
        expect(MECHANIC_AFFINITY[m], `机制「${m}」缺少亲和定义`).toBeTruthy();
      }
    }
  });
});
