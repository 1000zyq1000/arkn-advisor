import { describe, expect, it } from 'vitest';
import { parseDepotJson, parseOperBoxJson } from '../src/lib/import/generic';

/** 针对 generic.ts 各分支形态的边界测试（保障覆盖率门槛真实达成而非放水） */
describe('generic 导入器边界形态', () => {
  it('解析 { items: [...] } 包裹形态', () => {
    const r = parseDepotJson(JSON.stringify({ items: [{ name: '固源岩', count: 4 }] }));
    expect(r.value).toEqual({ 固源岩: 4 });
  });

  it('解析 { list: [...] } 包裹形态', () => {
    const r = parseOperBoxJson(JSON.stringify({ list: [{ name: '芬', elite: 1, level: 50 }] }));
    expect(r.value).toHaveLength(1);
  });

  it('无法识别的顶层形态给出警告', () => {
    const r = parseOperBoxJson(JSON.stringify({ foo: 1 }));
    expect(r.value).toHaveLength(0);
    expect(r.warnings.some((w) => w.includes('未找到条目数组'))).toBe(true);
  });

  it('库存映射中非数字值跳过并警告', () => {
    const r = parseDepotJson(JSON.stringify({ 源岩: 'abc' }));
    expect(r.value).toEqual({});
    expect(r.warnings.some((w) => w.includes('不是数字'))).toBe(true);
  });

  it('干员条目接受字符串形式的数字字段', () => {
    const r = parseOperBoxJson(JSON.stringify([{ name: '芬', elite: '1', level: '50' }]));
    expect(r.value[0]).toMatchObject({ elite: 1, level: 50 });
  });

  it('非整数潜能四舍五入', () => {
    const r = parseOperBoxJson(JSON.stringify([{ name: '芬', potential: 2.6 }]));
    expect(r.value[0]!.potential).toBe(3);
  });

  it('空对象库存返回空映射且无警告', () => {
    const r = parseDepotJson('{}');
    expect(r.value).toEqual({});
    expect(r.warnings).toHaveLength(0);
  });
});
