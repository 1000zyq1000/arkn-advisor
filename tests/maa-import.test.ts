import { describe, expect, it } from 'vitest';
import { parseMaaOperBoxJson } from '../src/lib/import/maa';
import { OPER_BOX_ADAPTERS } from '../src/lib/import';

/**
 * 按官方核实 schema（OperBoxData.OperData，MAA v6.18.0）构造的导出样例：
 * MAA「工具箱 → 干员识别 → 导出」为裸数组，包含全量干员（未拥有者 own=false 且无练度）。
 */
const MAA_EXPORT_FULL = JSON.stringify([
  { id: 'char_002_amiya', name: '阿米娅', elite: 2, level: 80, own: true, potential: 1, rarity: 5 },
  { id: 'char_103_angel', name: '能天使', elite: 2, level: 90, own: true, potential: 6, rarity: 6 },
  { id: 'char_999 Nobody', name: '未拥有干员甲', elite: 0, level: 0, own: false, potential: 0, rarity: 3 },
  { id: 'char_999_nobody2', name: '未拥有干员乙', elite: 0, level: 0, own: false, potential: 0, rarity: 4 },
]);

describe('parseMaaOperBoxJson（严格解析，格式依据 NOTICE.md 登记）', () => {
  it('解析裸数组导出：own=false 的未拥有干员被跳过并汇总告警', () => {
    const r = parseMaaOperBoxJson(MAA_EXPORT_FULL);
    expect(r.value).toHaveLength(2);
    expect(r.value[0]).toMatchObject({ name: '阿米娅', elite: 2, level: 80, potential: 1 });
    expect(r.value[1]).toMatchObject({ name: '能天使', elite: 2, level: 90, potential: 6 });
    expect(r.warnings.some((w) => w.includes('own=false'))).toBe(true);
  });

  it('解析内部存档信封 { done, own_opers, source, syncTime }', () => {
    const r = parseMaaOperBoxJson(
      JSON.stringify({ done: true, own_opers: [{ id: 'char_002_amiya', name: '阿米娅', elite: 1, level: 50, own: true, rarity: 5 }], source: 'recognition' }),
    );
    expect(r.value).toHaveLength(1);
    expect(r.value[0]).toMatchObject({ name: '阿米娅', elite: 1, level: 50 });
  });

  it('解析完整回调消息 { details: { done, all_opers, own_opers } }，all_opers 被忽略', () => {
    const r = parseMaaOperBoxJson(
      JSON.stringify({
        what: 'OperBoxInfo',
        details: {
          done: true,
          all_opers: [{ id: 'char_002_amiya', name: '阿米娅', own: true, rarity: 5 }],
          own_opers: [{ id: 'char_103_angel', name: '能天使', elite: 2, level: 80, own: true, rarity: 6 }],
        },
      }),
    );
    expect(r.value).toHaveLength(1);
    expect(r.value[0]!.name).toBe('能天使');
  });

  it('done=false 时提示结果可能不完整', () => {
    const r = parseMaaOperBoxJson(
      JSON.stringify({ done: false, own_opers: [{ id: 'char_002_amiya', name: '阿米娅', elite: 0, level: 1, own: true }] }),
    );
    expect(r.value).toHaveLength(1);
    expect(r.warnings.some((w) => w.includes('done=false'))).toBe(true);
  });

  it('条目缺少 own 字段时按拥有处理并汇总告警（非标准导出）', () => {
    const r = parseMaaOperBoxJson(JSON.stringify([{ id: 'char_002_amiya', name: '阿米娅', elite: 1, level: 50, rarity: 5 }]));
    expect(r.value).toHaveLength(1);
    expect(r.warnings.some((w) => w.includes('缺少 own 字段'))).toBe(true);
  });

  it('整体形态不符合 MAA 格式时直接报错（与 generic 的区别）', () => {
    expect(() => parseMaaOperBoxJson(JSON.stringify({ operators: [{ name: '芬', elite: 1, level: 50 }] }))).toThrow(
      /不符合 MAA 导出格式/,
    );
  });

  it('非法 JSON 抛出带原因的错误', () => {
    expect(() => parseMaaOperBoxJson('not json')).toThrow(/无法解析 JSON/);
  });

  it('越界 elite/level/potential 钳制到官方取值范围并告警', () => {
    const r = parseMaaOperBoxJson(
      JSON.stringify([{ id: 'char_002_amiya', name: '阿米娅', elite: 5, level: 999, own: true, potential: 9 }]),
    );
    expect(r.value[0]).toMatchObject({ elite: 2, level: 90, potential: 6 });
    expect(r.warnings.some((w) => w.includes('精英化'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('等级'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('潜能'))).toBe(true);
  });

  it('非数值字段（类型异常）告警并按默认值处理', () => {
    const r = parseMaaOperBoxJson(
      JSON.stringify([{ id: 'char_002_amiya', name: '阿米娅', elite: '2', level: '80', own: true, potential: 'x' }]),
    );
    expect(r.value[0]).toMatchObject({ elite: 0, level: 1 });
    expect(r.value[0]!.potential).toBeUndefined();
    expect(r.warnings.some((w) => w.includes('潜能字段类型异常'))).toBe(true);
  });

  it('缺少 name 的条目跳过并告警', () => {
    const r = parseMaaOperBoxJson(
      JSON.stringify([{ id: 'char_999_x', elite: 1, level: 30, own: true }, { id: 'char_002_amiya', name: '阿米娅', elite: 0, level: 1, own: true }]),
    );
    expect(r.value).toHaveLength(1);
    expect(r.warnings.some((w) => w.includes('缺少 name'))).toBe(true);
  });

  it('同名多条记录保留最后一条并告警', () => {
    const r = parseMaaOperBoxJson(
      JSON.stringify([
        { id: 'char_002_amiya', name: '阿米娅', elite: 0, level: 1, own: true },
        { id: 'char_002_amiya', name: '阿米娅', elite: 2, level: 80, own: true },
      ]),
    );
    expect(r.value).toHaveLength(1);
    expect(r.value[0]).toMatchObject({ elite: 2, level: 80 });
    expect(r.warnings.some((w) => w.includes('出现多条记录'))).toBe(true);
  });

  it('注册表中 maa 适配器已可用且挂接本解析器', () => {
    const maa = OPER_BOX_ADAPTERS.find((a) => a.id === 'maa');
    expect(maa?.status).toBe('available');
    expect(maa?.parse).toBe(parseMaaOperBoxJson);
    expect(OPER_BOX_ADAPTERS.find((a) => a.id === 'generic')?.status).toBe('available');
  });
});
