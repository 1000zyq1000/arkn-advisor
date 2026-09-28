/** 数据说明页：数据源状态、免责声明、隐私。 */
import { OPER_BOX_ADAPTERS } from '../lib/import';
import type { Dataset } from '../lib/types';

interface Props {
  dataset: Dataset;
}

const STATUS_LABEL: Record<string, string> = {
  available: '可用',
  todo: '待接入',
};

const SOURCE_STATUS: { name: string; state: '已内置' | '可用' | '待核实' | '规划中'; note: string }[] = [
  {
    name: '真实游戏数据（默认）',
    state: '可用',
    note: '干员 429 名、材料与合成配方、按干员的精英化消耗、主线与资源关掉落列表 —— 全部数值转换自游戏数据提取（Kengxxiao/ArknightsGameData，blob SHA 核验记录见 NOTICE.md）。期望掉率与挑战关卡机制标注尚无真实来源，见下。',
  },
  {
    name: '内置样例数据集',
    state: '已内置',
    note: '合成数值（材料/关卡/消耗均为虚构），可通过顶部数据源切换选中，仅用于演示与对照。',
  },
  {
    name: '通用 JSON 导入',
    state: '可用',
    note: '宽容解析常见字段别名，可用于手写数据或第三方导出的近似格式。',
  },
  {
    name: 'MAA 干员识别 / 仓库识别导出',
    state: '可用',
    note: '干员识别导出已实现严格解析——格式对照 MAA 官方发布源码（tag v6.18.0）逐文件核实，依据与行号见 NOTICE.md；仓库识别导出可经「通用 JSON」入口粘贴。',
  },
  {
    name: '真实掉率（刷图规划的关键）',
    state: '待核实',
    note: '期望掉率不在游戏数据中。企鹅物流 API 已实测可用（记录见 NOTICE.md），但书面数据条款尚未确认 —— 确认后接入，刷图规划自动完整。',
  },
  {
    name: '挑战关卡机制标注（「按目标关卡」）',
    state: '可用',
    note: '53 个绝境作战关卡的机制需求由本项目从敌人基础数值启发式推导（规则与阈值透明，见生成脚本与 NOTICE.md）—— 编辑性标注而非官方数据。',
  },
  {
    name: 'PRTS Wiki',
    state: '规划中',
    note: '干员资料扩展候选，同样需先核实许可。',
  },
];

export default function AboutPanel({ dataset }: Props) {
  return (
    <div className="panel">
      <section className="card">
        <h2>数据源状态</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>数据源</th>
                <th>状态</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              {SOURCE_STATUS.map((s) => (
                <tr key={s.name}>
                  <td>{s.name}</td>
                  <td>
                    <span className={`state state-${s.state}`}>{s.state}</span>
                  </td>
                  <td className="muted">{s.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">导入适配器注册表：{OPER_BOX_ADAPTERS.map((a) => `${a.label}（${STATUS_LABEL[a.status]}）`).join('、')}。</p>
      </section>

      <section className="card">
        <h2>当前数据集声明</h2>
        <p>{dataset.isSample ? '⚠ 内置合成样例数据 —— 以下说明随数据加载展示：' : '数据集说明：'}</p>
        <blockquote>{dataset.metaNote}</blockquote>
      </section>

      <section className="card">
        <h2>免责与隐私</h2>
        <ul>
          <li>本项目为社区工具，与鹰角网络 / Yostar 无关；游戏内名称与术语版权归其权利人所有。</li>
          <li>所有计算均在你浏览器本地完成，<strong>不上传任何数据</strong>；box 与库存仅保存在本地 localStorage。</li>
          <li>在接入真实数据源之前，推荐与规划结果仅为功能演示，请勿作为养成决策依据。</li>
        </ul>
      </section>
    </div>
  );
}
