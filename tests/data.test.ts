import { describe, expect, it } from 'vitest';
import { depotByNameToIds, loadDataset, resetDatasetCache } from '../src/lib/data';
import { MECHANIC_AFFINITY } from '../src/lib/mechanics';
import { PROFESSIONS } from '../src/lib/types';

/**
 * 数据完整性测试：真实数据集与样例数据集都是一等公民，
 * 所有交叉引用必须有效，诚实性标注必须可锁定。
 */

describe('真实数据集（默认）', () => {
  const dataset = loadDataset('real');

  it('标注为真实游戏数据，且不带样例横幅', () => {
    expect(dataset.isSample).toBe(false);
    expect(dataset.metaNote).toContain('游戏数据');
  });

  it('干员规模达到全量名单（≥ 300）且字段合法、无重名', () => {
    expect(dataset.operators.length).toBeGreaterThanOrEqual(300);
    const names = dataset.operators.map((o) => o.name);
    expect(new Set(names).size).toBe(names.length);
    for (const op of dataset.operators) {
      expect(op.rarity).toBeGreaterThanOrEqual(1);
      expect(op.rarity).toBeLessThanOrEqual(6);
      expect(PROFESSIONS).toContain(op.profession);
      expect(Array.isArray(op.tags)).toBe(true);
    }
  });

  it('干员名单包含已核实的真实样本', () => {
    const amiya = dataset.operators.find((o) => o.name === '阿米娅');
    expect(amiya).toMatchObject({ rarity: 5, profession: '术师' });
    const exusiai = dataset.operators.find((o) => o.name === '能天使');
    expect(exusiai).toMatchObject({ rarity: 6, profession: '狙击' });
  });

  it('每名干员都有精英化消耗数据，且引用的材料存在', () => {
    for (const op of dataset.operators) {
      const cost = dataset.operatorCosts[op.name];
      expect(cost, `干员 ${op.name} 缺少精英化消耗`).toBeTruthy();
      for (const mc of [...cost.phase1, ...cost.phase2]) {
        expect(dataset.materials[mc.materialId], `材料 ${mc.materialId} 不存在`).toBeTruthy();
        expect(mc.count).toBeGreaterThan(0);
      }
    }
  });

  it('真实消耗样本锁定：阿米娅精一含术师芯片×3（防止生成器回归）', () => {
    const cost = dataset.operatorCosts['阿米娅'];
    expect(cost.phase1).toContainEqual({ materialId: '3251', count: 3 });
  });

  it('关卡掉落引用材料存在，理智为正；真实掉率如实为 0（未接入）', () => {
    const codes = dataset.stages.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const stage of dataset.stages) {
      expect(stage.sanity).toBeGreaterThan(0);
      for (const drop of stage.drops) {
        expect(dataset.materials[drop.materialId], `材料 ${drop.materialId} 不存在`).toBeTruthy();
        // 掉率不在游戏数据中：必须是 0，绝不允许出现虚构数值
        expect(drop.expectPerRun).toBe(0);
      }
    }
  });

  it('常驻资源关均已收录（芯片/碳素/龙门币/采购凭证）', () => {
    for (const code of ['CE-6', 'SK-5', 'AP-5', 'PR-B-2', 'PR-C-2']) {
      expect(dataset.stages.some((s) => s.code === code), `缺少资源关 ${code}`).toBe(true);
    }
  });

  it('合成配方引用更低等级的材料', () => {
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

  it('龙门币在材料表中（MAA 库存导入不产生未知项告警）', () => {
    expect(dataset.materials['4001']?.name).toBe('龙门币');
  });

  it('挑战关卡（绝境作战）由敌人数值启发式推导，全部命中亲和表且编号唯一', () => {
    // 53 个绝境作战关卡，全部应推导出至少一种机制需求
    expect(dataset.challengeStages.length).toBeGreaterThanOrEqual(50);
    const codes = dataset.challengeStages.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const stage of dataset.challengeStages) {
      expect(/^H\d/.test(stage.code), `非绝境关卡混入：${stage.code}`).toBe(true);
      expect(stage.mechanics.length).toBeGreaterThan(0);
      for (const m of stage.mechanics) {
        expect(MECHANIC_AFFINITY[m], `机制「${m}」缺少亲和定义`).toBeTruthy();
      }
    }
  });

  it('挑战关卡抽样锁定：H6-4（冰狱行动-4）需要法伤', () => {
    const h64 = dataset.challengeStages.find((s) => s.code === 'H6-4');
    expect(h64?.mechanics).toContain('需要法伤');
  });

  it('depotByNameToIds 同时接受材料名与材料 ID 作为键', () => {
    const { depot, unknownNames } = depotByNameToIds(
      { 龙门币: 100, '4001': 50, 幻影材料: 1 },
      dataset,
    );
    expect(depot['4001']).toBe(150);
    expect(unknownNames).toEqual(['幻影材料']);
  });
});

describe('样例数据集（切换）', () => {
  const dataset = loadDataset('sample');

  it('明确标注为合成样例数据', () => {
    expect(dataset.isSample).toBe(true);
    expect(dataset.metaNote).toContain('虚构');
  });

  it('干员数量充足且字段合法', () => {
    expect(dataset.operators.length).toBeGreaterThanOrEqual(20);
    const names = dataset.operators.map((o) => o.name);
    expect(new Set(names).size).toBe(names.length);
    for (const op of dataset.operators) {
      expect(PROFESSIONS).toContain(op.profession);
      expect(op.tags.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('按稀有度模板合成的按干员消耗：引用的材料存在', () => {
    for (const op of dataset.operators) {
      const cost = dataset.operatorCosts[op.name];
      expect(cost, `干员 ${op.name} 缺少精英化消耗`).toBeTruthy();
      for (const mc of [...cost.phase1, ...cost.phase2]) {
        expect(dataset.materials[mc.materialId], `材料 ${mc.materialId} 不存在`).toBeTruthy();
      }
    }
  });

  it('关卡掉落引用的材料存在，样例掉率为正', () => {
    for (const stage of dataset.stages) {
      expect(stage.sanity).toBeGreaterThan(0);
      for (const drop of stage.drops) {
        expect(dataset.materials[drop.materialId], `材料 ${drop.materialId} 不存在`).toBeTruthy();
        expect(drop.expectPerRun).toBeGreaterThan(0);
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

describe('数据集缓存', () => {
  it('按来源分别缓存，重置后仍加载同一对象', () => {
    resetDatasetCache();
    const real = loadDataset('real');
    const sample = loadDataset('sample');
    expect(real).not.toBe(sample);
    expect(loadDataset('real')).toBe(real);
    expect(loadDataset('sample')).toBe(sample);
    expect(loadDataset()).toBe(real); // 默认为真实数据集
  });
});
