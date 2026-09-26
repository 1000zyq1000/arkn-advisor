import { describe, expect, it } from 'vitest';
import { parseOperBoxJson, parseDepotJson } from '../src/lib/import/generic';

describe('parseOperBoxJson', () => {
  it('解析顶层数组', () => {
    const r = parseOperBoxJson(
      JSON.stringify([{ name: '芬', elite: 1, level: 50 }, { name: '能天使', elite: 2, level: 80, potential: 2 }]),
    );
    expect(r.value).toHaveLength(2);
    expect(r.value[0]).toMatchObject({ name: '芬', elite: 1, level: 50 });
    expect(r.value[1]!.potential).toBe(2);
    expect(r.warnings).toHaveLength(0);
  });

  it('解析包裹对象（operators / own_opers / data 等键）', () => {
    for (const key of ['operators', 'own_opers', 'data']) {
      const r = parseOperBoxJson(JSON.stringify({ [key]: [{ name: '克洛丝', elite: 0, level: 30 }] }));
      expect(r.value).toHaveLength(1);
      expect(r.value[0]!.name).toBe('克洛丝');
    }
  });

  it('识别常见中文字段别名', () => {
    const r = parseOperBoxJson(JSON.stringify([{ 干员: '安赛尔', 精英: 1, 等级: 45 }]));
    expect(r.value[0]).toMatchObject({ name: '安赛尔', elite: 1, level: 45 });
  });

  it('越界的 elite/level 会被钳制并给出警告', () => {
    const r = parseOperBoxJson(JSON.stringify([{ name: '玫兰莎', elite: 7, level: 999 }]));
    expect(r.value[0]!.elite).toBe(2);
    expect(r.value[0]!.level).toBe(1);
    expect(r.warnings).toHaveLength(2);
  });

  it('缺少名字的条目跳过并警告', () => {
    const r = parseOperBoxJson(JSON.stringify([{ elite: 1 }, { name: '芬', elite: 0 }]));
    expect(r.value).toHaveLength(1);
    expect(r.warnings.some((w) => w.includes('缺少干员名'))).toBe(true);
  });

  it('非法 JSON 抛出带原因的错误', () => {
    expect(() => parseOperBoxJson('not json')).toThrow(/无法解析 JSON/);
  });
});

describe('parseDepotJson', () => {
  it('解析直接映射形态', () => {
    const r = parseDepotJson(JSON.stringify({ 源岩: 20, 固源岩: 4 }));
    expect(r.value).toEqual({ 源岩: 20, 固源岩: 4 });
  });

  it('解析条目数组形态并支持数量别名', () => {
    const r = parseDepotJson(JSON.stringify([{ name: '糖', count: 3 }, { name: '龙门币', have: 50000 }]));
    expect(r.value).toEqual({ 糖: 3, 龙门币: 50000 });
  });

  it('解析包裹对象 data 键', () => {
    const r = parseDepotJson(JSON.stringify({ data: { 酮凝集: 12 } }));
    expect(r.value).toEqual({ 酮凝集: 12 });
  });

  it('负数与非数字数量跳过并警告', () => {
    const r = parseDepotJson(JSON.stringify({ 源岩: -1, 糖: 'abc' }));
    expect(r.value).toEqual({});
    expect(r.warnings).toHaveLength(2);
  });

  it('非法 JSON 抛错', () => {
    expect(() => parseDepotJson('{{')).toThrow(/无法解析 JSON/);
  });
});
