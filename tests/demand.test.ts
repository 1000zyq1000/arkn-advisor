import { describe, expect, it } from 'vitest';
import { buildDemand } from '../src/lib/demand';
import { loadDataset } from '../src/lib/data';

describe('buildDemand（样例数据集）', () => {
  const dataset = loadDataset();

  it('目标精二 = 累加 phase1 + phase2', () => {
    const surtr = dataset.operators.find((o) => o.name === '史尔特尔')!;
    const demand = buildDemand([{ info: surtr, targetPhase: 2 }], dataset);
    const gold = demand.find((d) => d.materialId === 'gold')!;
    expect(gold.count).toBe(30000 + 180000);
    const ore3 = demand.find((d) => d.materialId === 'ore3')!;
    expect(ore3.count).toBe(10);
  });

  it('目标精一只需 phase1', () => {
    const surtr = dataset.operators.find((o) => o.name === '史尔特尔')!;
    const demand = buildDemand([{ info: surtr, targetPhase: 1 }], dataset);
    const gold = demand.find((d) => d.materialId === 'gold')!;
    expect(gold.count).toBe(30000);
    expect(demand.find((d) => d.materialId === 'ore3')).toBeUndefined();
  });

  it('多名干员的同类材料会合并', () => {
    const a = dataset.operators.find((o) => o.name === '史尔特尔')!;
    const b = dataset.operators.find((o) => o.name === '银灰')!;
    const single = buildDemand([{ info: a, targetPhase: 2 }], dataset);
    const double = buildDemand(
      [
        { info: a, targetPhase: 2 },
        { info: b, targetPhase: 2 },
      ],
      dataset,
    );
    for (const s of single) {
      const d = double.find((x) => x.materialId === s.materialId)!;
      expect(d.count).toBe(s.count * 2);
    }
  });

  it('稀有度缺少模板时抛出可读错误', () => {
    const fake = { name: '不存在', rarity: 6 as const, profession: '近卫' as const, tags: [] };
    const broken = { ...dataset, evolutionCosts: {} };
    expect(() => buildDemand([{ info: fake, targetPhase: 2 }], broken)).toThrow(/精英化消耗模板/);
  });
});
