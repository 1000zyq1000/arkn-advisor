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
    name: '内置样例数据集',
    state: '已内置',
    note: '合成数值（材料/关卡/消耗均为虚构），仅用于演示与联调，UI 顶部横幅常驻提示。',
  },
  {
    name: '通用 JSON 导入',
    state: '可用',
    note: '宽容解析常见字段别名，可用于手写数据或第三方导出的近似格式。',
  },
  {
    name: 'MAA 干员识别 / 仓库识别导出',
    state: '待核实',
    note: '适配器接口已预留。必须对照 MAA 发布源码核实导出 JSON 的确切字段后实现（步骤见 CONTRIBUTING.md），当前不提供任何猜测实现。',
  },
  {
    name: '企鹅物流数据统计',
    state: '规划中',
    note: '用于真实掉率与刷图效率；接入前需确认其 API 与数据许可并登记 NOTICE。',
  },
  {
    name: '一图流 / PRTS',
    state: '规划中',
    note: '养成效率与干员资料数据源候选，同样需先核实许可与接口。',
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
