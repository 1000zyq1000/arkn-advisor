/**
 * MAA 导入适配器 —— 干员识别导出的严格解析。
 *
 * 格式已对照 MAA 官方发布源码独立核实（tag v6.18.0，2026-09-26 核实，
 * 仓库 https://github.com/MaaAssistantArknights/MaaAssistantArknights ，核实方式见 NOTICE.md）：
 *
 * - 干员导出为**裸 JSON 数组**，条目 schema 来自 OperBoxData.OperData 的 JsonProperty 注解：
 *   src/MaaWpfGui/Models/OperBoxData.cs:20-80
 *     { id, name, elite, level, own, potential, rarity, mainSkillLevel?, skills?, equips? }
 *   （mainSkillLevel / skills / equips 仅当数据源自一图流 OpenAPI 时出现，本适配器忽略）
 * - 导出动作（复制到剪贴板 / 另存 .json）即上述数组的序列化（Formatting.Indented）：
 *   src/MaaWpfGui/ViewModels/UI/ToolboxViewModel.cs:1956-2015（BuildOperBoxExportList）、
 *   2003-2015（ExportOperBoxToClipboard）、2043-2050（ExportOperBoxToJson）。
 *   未拥有干员同样导出：own=false 且无练度字段（elite/level/potential 为 0），本适配器跳过。
 * - 额外兼容两种官方信封形态（便于粘贴识别回调或内部存档）：
 *   Core 回调 details：{ done, all_opers, own_opers }
 *     （src/MaaCore/Task/Miscellaneous/OperBoxRecognitionTask.cpp:61-104）
 *   GUI 内部存档：{ done, own_opers, source, syncTime }
 *     （src/MaaWpfGui/ViewModels/UI/ToolboxViewModel.cs:1527-1541）
 *
 * 与 generic（宽容解析）的区别：本适配器按 MAA 确切 schema 严格校验字段名与类型，
 * 整体形态不匹配时直接报错而非猜测；条目级异常以 warnings 返回，绝不静默丢弃。
 *
 * 仓库（材料）导出格式同样已核实，可粘贴到「材料库存」入口由 generic 解析：
 *   ArkPlanner：{ "@type":"@penguin-statistics/depot", items:[{id,have,name}] }
 *     （ToolboxViewModel.cs:654-686）
 *   Lolicon：{ 材料ID: 数量 }（键为 id，需与数据集材料名匹配）
 *     （ToolboxViewModel.cs:691-719）
 */
import type { Elite, OperBoxEntry } from '../types';
import type { ParseResult } from './generic';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** 严格数字：MAA 对数值字段恒输出 number；其他类型视为格式异常（返回 undefined 由调用方告警）。 */
function asStrictNumber(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/**
 * 解析 MAA 干员识别导出 JSON。
 * 支持：裸数组（剪贴板 / .json 文件导出）、{ own_opers: [...] }（回调 details / 内部存档）、
 * { details: { own_opers: [...] } }（完整回调消息）。
 */
export function parseMaaOperBoxJson(text: string): ParseResult<OperBoxEntry[]> {
  const warnings: string[] = [];
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new Error(`无法解析 JSON：${e instanceof Error ? e.message : String(e)}`);
  }

  let arr: unknown;
  let done: unknown;
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (isRecord(raw) && Array.isArray(raw['own_opers'])) {
    arr = raw['own_opers'];
    done = raw['done'];
  } else if (isRecord(raw) && isRecord(raw['details']) && Array.isArray(raw.details['own_opers'])) {
    arr = raw.details['own_opers'];
    done = raw.details['done'];
  }
  if (!Array.isArray(arr)) {
    throw new Error(
      '不符合 MAA 导出格式：预期为 JSON 数组，或包含 own_opers 数组的对象。' +
        '请使用 MAA「工具箱 → 干员识别 → 导出」的原始内容；若是其他来源，请改用「通用 JSON」入口。',
    );
  }
  if (done === false) {
    warnings.push('MAA 标记 done=false：识别尚未完成，结果可能不完整。');
  }

  const byName = new Map<string, OperBoxEntry>();
  let skippedNotOwned = 0;
  let missingOwn = 0;

  arr.forEach((item, i) => {
    if (!isRecord(item)) {
      warnings.push(`第 ${i + 1} 条不是对象，已跳过。`);
      return;
    }
    const own = item['own'];
    if (own === false) {
      skippedNotOwned += 1;
      return;
    }
    if (own !== true) {
      missingOwn += 1;
    }

    const name = typeof item['name'] === 'string' ? item['name'].trim() : '';
    if (!name) {
      warnings.push(`第 ${i + 1} 条缺少 name，已跳过。`);
      return;
    }

    // MAA 对 own=true 的条目恒有 elite/level；缺失时按官方默认值处理并告警。
    let elite = asStrictNumber(item['elite']) ?? 0;
    if (elite < 0 || elite > 2) {
      const clamped = Math.min(2, Math.max(0, Math.round(elite)));
      warnings.push(`「${name}」的精英化取值 ${elite} 不在 0–2 范围，已钳制为 ${clamped}。`);
      elite = clamped;
    }
    let level = asStrictNumber(item['level']) ?? 1;
    if (level < 1 || level > 90) {
      const clamped = Math.min(90, Math.max(1, Math.round(level)));
      warnings.push(`「${name}」的等级 ${level} 不在 1–90 范围，已钳制为 ${clamped}。`);
      level = clamped;
    }

    const potRaw = item['potential'];
    let potential: number | undefined;
    if (potRaw !== undefined && potRaw !== null) {
      const pot = asStrictNumber(potRaw);
      if (pot === undefined) {
        warnings.push(`「${name}」的潜能字段类型异常（${JSON.stringify(potRaw)}），已忽略。`);
      } else {
        potential = Math.min(6, Math.max(0, Math.round(pot)));
        if (potential !== pot) {
          warnings.push(`「${name}」的潜能 ${pot} 不在 0–6 范围，已钳制为 ${potential}。`);
        }
      }
    }

    if (byName.has(name)) {
      warnings.push(`「${name}」出现多条记录，已保留最后一条。`);
    }
    byName.set(name, { name, elite: elite as Elite, level, potential });
  });

  if (skippedNotOwned > 0) {
    warnings.push(`已跳过 ${skippedNotOwned} 条 own=false 的未拥有干员记录（MAA 导出包含全量干员名单）。`);
  }
  if (missingOwn > 0) {
    warnings.push(`${missingOwn} 条记录缺少 own 字段，已按拥有处理——这可能不是 MAA 标准导出。`);
  }
  if (byName.size === 0 && skippedNotOwned === 0 && warnings.length === 0) {
    warnings.push('解析结果为空。');
  }
  return { value: [...byName.values()], warnings };
}
