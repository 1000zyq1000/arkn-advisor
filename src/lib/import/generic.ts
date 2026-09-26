/**
 * 通用 JSON 导入器 —— 宽容解析干员 box 与材料库存。
 *
 * 设计目标：
 * 1. 不依赖任何第三方工具的确切导出格式（MAA 适配器待核实后单独实现）；
 * 2. 常见字段别名自动匹配（中英文），便于手写与粘贴；
 * 3. 解析失败/跳过的条目以 warnings 返回，绝不静默丢弃。
 */
import type { Elite, OperBoxEntry } from '../types';

export interface ParseResult<T> {
  value: T;
  warnings: string[];
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

/** 从任意 JSON 值中提取“条目数组”，兼容顶层数组或 {operators|own_opers|opers|data|items: [...]} */
export function extractArray(raw: unknown, warnings: string[]): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (raw !== null && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    for (const key of ['operators', 'own_opers', 'opers', 'data', 'items', 'list']) {
      const v = obj[key];
      if (Array.isArray(v)) return v as Record<string, unknown>[];
    }
  }
  warnings.push('未找到条目数组：预期为 JSON 数组，或包含 operators / own_opers / opers / data / items 键的对象。');
  return [];
}

/**
 * 解析干员 box JSON。
 * 条目字段别名：name ← name/名/干员/operName；elite ← elite/精英/evolve/phase；level ← level/等级；potential ← potential/潜能
 */
export function parseOperBoxJson(text: string): ParseResult<OperBoxEntry[]> {
  const warnings: string[] = [];
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new Error(`无法解析 JSON：${e instanceof Error ? e.message : String(e)}`);
  }

  const arr = extractArray(raw, warnings);
  const entries: OperBoxEntry[] = [];
  arr.forEach((item, i) => {
    if (item === null || typeof item !== 'object') {
      warnings.push(`第 ${i + 1} 条不是对象，已跳过。`);
      return;
    }
    const obj = item as Record<string, unknown>;
    const nameRaw = pick(obj, ['name', '名', '干员', '干员名', 'operName', 'nickName']);
    const name = typeof nameRaw === 'string' ? nameRaw.trim() : '';
    if (!name) {
      warnings.push(`第 ${i + 1} 条缺少干员名（name），已跳过。`);
      return;
    }
    let elite = asNumber(pick(obj, ['elite', '精英', '精英化', 'evolve', 'phase'])) ?? 0;
    let level = asNumber(pick(obj, ['level', '等级'])) ?? 1;
    const potential = asNumber(pick(obj, ['potential', '潜能']));

    if (elite < 0 || elite > 2) {
      warnings.push(`「${name}」的精英化取值 ${elite} 不在 0–2 范围，已按 2 处理。`);
      elite = 2;
    }
    if (level < 1 || level > 90) {
      warnings.push(`「${name}」的等级 ${level} 不在 1–90 范围，已按 1 处理。`);
      level = 1;
    }

    entries.push({ name, elite: elite as Elite, level, potential });
  });

  if (entries.length === 0 && warnings.length === 0) {
    warnings.push('解析结果为空。');
  }
  return { value: entries, warnings };
}

/**
 * 解析材料库存 JSON，产出以材料名为 key 的数量表。
 * 兼容两种形态：条目数组（[{name,count}]），或直接映射（{"固源岩": 42}）。
 * 字段别名：count ← count/数量/have/own/拥有；name ← name/名/名称/material。
 */
export function parseDepotJson(text: string): ParseResult<Record<string, number>> {
  const warnings: string[] = [];
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new Error(`无法解析 JSON：${e instanceof Error ? e.message : String(e)}`);
  }

  const depot: Record<string, number> = {};
  const add = (name: string, count: number, where: string) => {
    const n = name.trim();
    if (!n) {
      warnings.push(`${where} 存在空名称条目，已跳过。`);
      return;
    }
    if (!Number.isFinite(count) || count < 0) {
      warnings.push(`${where}「${n}」的数量 ${count} 无效，已跳过。`);
      return;
    }
    depot[n] = (depot[n] ?? 0) + count;
  };

  if (Array.isArray(raw)) {
    (raw as Record<string, unknown>[]).forEach((item, i) => {
      if (item === null || typeof item !== 'object') {
        warnings.push(`第 ${i + 1} 条不是对象，已跳过。`);
        return;
      }
      const obj = item as Record<string, unknown>;
      const name = pick(obj, ['name', '名', '名称', 'material', 'materialName']);
      const count = asNumber(pick(obj, ['count', '数量', 'have', 'own', '拥有']));
      if (count === undefined) {
        warnings.push(`第 ${i + 1} 条缺少数量（count），已跳过。`);
        return;
      }
      add(typeof name === 'string' ? name : '', count, `第 ${i + 1} 条`);
    });
  } else if (raw !== null && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const inner = pick(obj, ['data', 'items', 'materials', 'inventory', 'details']);
    if (inner !== undefined && inner !== null && typeof inner === 'object') {
      const innerObj = inner as Record<string, unknown>;
      if (Array.isArray(inner)) {
        // 罕见：{ items: [...] } 形态
        for (const item of inner as Record<string, unknown>[]) {
          const name = pick(item, ['name', '名', '名称', 'material', 'materialName']);
          const count = asNumber(pick(item, ['count', '数量', 'have', 'own', '拥有']));
          if (count !== undefined) add(typeof name === 'string' ? name : '', count, '库存条目');
        }
      } else {
        for (const [k, v] of Object.entries(innerObj)) {
          const num = asNumber(v);
          if (num === undefined) {
            warnings.push(`库存映射「${k}」的值 ${JSON.stringify(v)} 不是数字，已跳过。`);
            continue;
          }
          add(k, num, '库存映射');
        }
      }
    } else {
      // 直接映射形态
      for (const [k, v] of Object.entries(obj)) {
        const num = asNumber(v);
        if (num === undefined) {
          warnings.push(`库存映射「${k}」的值 ${JSON.stringify(v)} 不是数字，已跳过。`);
          continue;
        }
        add(k, num, '库存映射');
      }
    }
  } else {
    warnings.push('无法识别的库存 JSON 形态。');
  }

  return { value: depot, warnings };
}
