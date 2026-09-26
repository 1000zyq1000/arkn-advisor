import { describe, expect, it } from 'vitest';
import { bestStageFor, planFarming } from '../src/lib/planner';
import type { Dataset } from '../src/lib/types';

/** 构造一个完全受控的小型数据集，避免依赖样例数值 */
function tinyDataset(): Dataset {
  return {
    materials: {
      a: { id: 'a', name: '甲', tier: 1 },
      b: { id: 'b', name: '乙', tier: 2, craft: { inputs: [{ materialId: 'a', count: 3 }] } },
      c: { id: 'c', name: '丙', tier: 3, craft: { inputs: [{ materialId: 'b', count: 2 }] } },
      d: { id: 'd', name: '丁', tier: 4, craft: { inputs: [{ materialId: 'c', count: 2 }] } },
    },
    operators: [],
    operatorCosts: {},
    stages: [
      { id: 's1', code: 'S1', name: '', sanity: 6, drops: [{ materialId: 'a', expectPerRun: 2 }] },
      {
        id: 's2',
        code: 'S2',
        name: '',
        sanity: 10,
        drops: [
          { materialId: 'a', expectPerRun: 1 },
          { materialId: 'b', expectPerRun: 0.5 },
        ],
      },
      { id: 's3', code: 'S3', name: '', sanity: 12, drops: [{ materialId: 'c', expectPerRun: 0.5 }] },
    ],
    challengeStages: [],
    isSample: false,
    metaNote: '',
  };
}

describe('bestStageFor', () => {
  it('按“每单位理智期望产出”择优', () => {
    const ds = tinyDataset();
    // a 在 S1 为 2/6 ≈ 0.333，S2 为 1/10 = 0.1 → 选 S1
    expect(bestStageFor('a', ds)?.stage.code).toBe('S1');
    expect(bestStageFor('c', ds)?.stage.code).toBe('S3');
    expect(bestStageFor('不存在', ds)).toBeNull();
  });
});

describe('planFarming', () => {
  const ds = tinyDataset();

  it('扣除库存后按最优关卡计算次数与理智', () => {
    const r = planFarming({ demand: [{ materialId: 'a', count: 5 }], depot: { a: 2 }, dataset: ds });
    const line = r.lines.find((l) => l.materialId === 'a')!;
    expect(line).toMatchObject({ need: 5, have: 2, craftSuggestion: 0, toFarm: 3, stageCode: 'S1', runs: 2, sanity: 12 });
    expect(r.totalSanity).toBe(12);
    expect(r.stageSummary).toEqual([{ code: 'S1', runs: 2, sanity: 12 }]);
    expect(r.warnings).toHaveLength(0);
  });

  it('库存充足时无需刷取', () => {
    const r = planFarming({ demand: [{ materialId: 'a', count: 5 }], depot: { a: 10 }, dataset: ds });
    expect(r.lines[0]).toMatchObject({ toFarm: 0, stageCode: undefined });
    expect(r.totalSanity).toBe(0);
  });

  it('数量为 0 的需求不产生行', () => {
    const r = planFarming({ demand: [{ materialId: 'a', count: 0 }], depot: {}, dataset: ds });
    expect(r.lines).toHaveLength(0);
    expect(r.totalSanity).toBe(0);
  });

  it('合成比直接刷取划算时，自动向下规划低级材料（链式）', () => {
    const r = planFarming({ demand: [{ materialId: 'c', count: 2 }], depot: { b: 2 }, dataset: ds });
    const c = r.lines.find((l) => l.materialId === 'c')!;
    expect(c.craftSuggestion).toBe(2); // 库存 2 乙 + 合成 2 乙 → 合成 2 丙
    expect(c.toFarm).toBe(0);
    const b = r.lines.find((l) => l.materialId === 'b')!;
    expect(b.craftSuggestion).toBe(2); // 缺口 2 乙由甲合成
    expect(b.supportFor).toContain('c');
    const a = r.lines.find((l) => l.materialId === 'a')!;
    expect(a.toFarm).toBe(6); // 刷 6 甲（S1，3 次 × 6 理智）供合成
    expect(a.supportFor).toContain('b');
    expect(r.totalSanity).toBe(18); // 远低于直接刷丙的 48
  });

  it('多需求共享库存：低级材料先被消耗，后续缺口链式展开', () => {
    const r = planFarming({
      demand: [
        { materialId: 'b', count: 1 },
        { materialId: 'c', count: 1 },
      ],
      depot: { a: 3 },
      dataset: ds,
    });
    const b = r.lines.find((l) => l.materialId === 'b')!;
    const c = r.lines.find((l) => l.materialId === 'c')!;
    expect(b.craftSuggestion).toBe(3); // 1 个自用 + 2 个为丙供料（库存甲耗尽后改为刷甲合成乙）
    expect(b.supportFor).toContain('c');
    expect(c.craftSuggestion).toBe(1);
    expect(c.toFarm).toBe(0); // 直接刷丙需 24 理智，合成路线仅 18
    expect(r.totalSanity).toBe(18);
  });

  it('四级链：无掉落材料通过配方递归获得', () => {
    const r = planFarming({ demand: [{ materialId: 'd', count: 1 }], depot: {}, dataset: ds });
    const d = r.lines.find((l) => l.materialId === 'd')!;
    expect(d.craftSuggestion).toBe(1);
    expect(d.stageCode).toBeUndefined();
    expect(r.warnings).toHaveLength(0);
    expect(r.totalSanity).toBe(36); // 递归到刷 12 甲（6 次 × 6 理智）
    const a = r.lines.find((l) => l.materialId === 'a')!;
    expect(a.toFarm).toBe(12);
    expect(a.runs).toBe(6);
  });

  it('完全无来源的材料进入警告清单', () => {
    const broken: Dataset = {
      ...ds,
      materials: { ...ds.materials, x: { id: 'x', name: '戊', tier: 4 } },
    };
    const r = planFarming({ demand: [{ materialId: 'x', count: 1 }], depot: {}, dataset: broken });
    expect(r.warnings.some((w) => w.includes('戊'))).toBe(true);
    expect(r.totalSanity).toBe(0);
  });

  it('需求中出现未知材料时警告并跳过', () => {
    const r = planFarming({ demand: [{ materialId: 'ghost', count: 1 }], depot: {}, dataset: ds });
    expect(r.warnings.some((w) => w.includes('ghost'))).toBe(true);
    expect(r.lines).toHaveLength(0);
  });
});
