import { describe, expect, it } from 'vitest';
import { analyzeBox, isRaised, recommend } from '../src/lib/recommend';
import type { Dataset, GoalPreset } from '../src/lib/types';

function tinyDataset() {
  const dataset: Dataset = {
    materials: {},
    operators: [
      { name: '重装核心', rarity: 6, profession: '近卫', tags: ['输出'] },
      { name: '奶妈', rarity: 5, profession: '医疗', tags: ['治疗'] },
      { name: '低星近卫', rarity: 3, profession: '近卫', tags: ['输出'] },
    ],
    evolutionCosts: {},
    stages: [],
    isSample: false,
    metaNote: '',
  };
  const preset: GoalPreset = {
    id: 't',
    label: '测试',
    description: '',
    classWeights: { 近卫: 1.0, 医疗: 1.5 },
    tagWeights: { 输出: 0.5, 治疗: 1.0 },
  };
  return { dataset, preset };
}

describe('isRaised', () => {
  it('精二 / 精一 45 级以上视为高练度', () => {
    expect(isRaised({ elite: 2, level: 1 })).toBe(true);
    expect(isRaised({ elite: 1, level: 45 })).toBe(true);
    expect(isRaised({ elite: 1, level: 44 })).toBe(false);
    expect(isRaised({ elite: 0, level: 90 })).toBe(false);
  });
});

describe('analyzeBox', () => {
  it('统计高练度职业与标签覆盖', () => {
    const { dataset } = tinyDataset();
    const box = { 重装核心: { elite: 2, level: 60 }, 奶妈: { elite: 1, level: 44 } };
    const a = analyzeBox(box, dataset);
    expect(a.raised.map((o) => o.name)).toEqual(['重装核心']);
    expect(a.professionCounts['近卫']).toBe(1);
    expect(a.professionCounts['医疗']).toBeUndefined();
    expect(a.missingProfessions).toContain('医疗');
    expect(a.tagCounts['输出']).toBe(1);
    expect(a.tagCounts['治疗']).toBeUndefined();
  });
});

describe('recommend', () => {
  const { dataset, preset } = tinyDataset();

  it('跳过已高练度干员', () => {
    const r = recommend({ 重装核心: { elite: 2, level: 60 } }, preset, dataset, 10);
    expect(r.find((x) => x.operator.name === '重装核心')).toBeUndefined();
    expect(r.length).toBe(2);
  });

  it('缺失职业获得权重加成，排在前面的理由可读', () => {
    const r = recommend({ 重装核心: { elite: 2, level: 60 } }, preset, dataset, 10);
    expect(r[0]!.operator.name).toBe('奶妈'); // 医疗职业缺失且权重 1.5
    expect(r[0]!.reasons.some((s) => s.includes('医疗'))).toBe(true);
    expect(r[0]!.reasons.some((s) => s.includes('治疗'))).toBe(true); // 标签空白加成
  });

  it('已精一（未达高练度线）的干员成本系数更低', () => {
    // 注意：精一且等级 ≥45 已视为高练度会被跳过，因此用 40 级的精一干员验证成本系数
    const withElite1 = recommend({ 低星近卫: { elite: 1, level: 40 } }, preset, dataset, 10);
    const without = recommend({}, preset, dataset, 10);
    const a = withElite1.find((x) => x.operator.name === '低星近卫')!;
    const b = without.find((x) => x.operator.name === '低星近卫')!;
    expect(a.costFactor).toBe(0.65);
    expect(b.costFactor).toBe(1.0);
    expect(a.score).toBeGreaterThan(b.score);
  });

  it('同分时按名字稳定排序', () => {
    const r1 = recommend({}, preset, dataset, 10);
    const r2 = recommend({}, preset, dataset, 10);
    expect(r1.map((x) => x.operator.name)).toEqual(r2.map((x) => x.operator.name));
  });
});
