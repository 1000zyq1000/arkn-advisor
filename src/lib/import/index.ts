/**
 * 导入适配器注册表。
 *
 * 当前只开放两个数据入口：
 * - generic：宽容解析的通用 JSON（本文件 generic.ts）；
 * - sample：一键载入内置示例。
 *
 * MAA 专用适配器为 TODO：必须先对照 MAA 发布源码核实其导出 JSON 的确切字段，
 * 再实现并附上来源（文件/行号）与测试样例。在此之前不提供任何“猜测实现”。
 */
import type { OperBoxEntry } from '../types';
import { parseOperBoxJson, type ParseResult } from './generic';

export type AdapterStatus = 'available' | 'todo';

export interface ImportAdapter {
  id: string;
  label: string;
  status: AdapterStatus;
  /** status === 'todo' 时向用户展示的说明 */
  note?: string;
  parse?: (text: string) => ParseResult<OperBoxEntry[]>;
}

export const OPER_BOX_ADAPTERS: ImportAdapter[] = [
  {
    id: 'generic',
    label: '通用 JSON（宽容解析）',
    status: 'available',
    parse: parseOperBoxJson,
  },
  {
    id: 'maa',
    label: 'MAA 干员识别导出',
    status: 'todo',
    note:
      '待核实：需要对照 MAA 发布源码确认导出 JSON 的确切结构后实现。' +
      '核实步骤见 CONTRIBUTING.md「如何核实并接入 MAA 导出格式」。' +
      '在此期间，可直接尝试「通用 JSON」入口——常见字段名会被自动识别。',
  },
];
