/** 规划页：选目标干员 → 计算材料缺口 → 合成建议 + 刷图理智规划。 */
import { useState } from 'react';
import type { Dataset, OperBoxEntry, PlanResult } from '../lib/types';
import { buildDemand, type DemandTarget } from '../lib/demand';
import { planFarming } from '../lib/planner';
import { RarityBadge, WarningsList, EmptyHint } from './ui';

interface Props {
  box: Record<string, OperBoxEntry>;
  depot: Record<string, number>;
  dataset: Dataset;
}

export default function PlanPanel({ box, depot, dataset }: Props) {
  const owned = dataset.operators.filter((o) => box[o.name]);
  const [selected, setSelected] = useState<Set<string>>(new Set(owned.map((o) => o.name)));
  const [targetPhase, setTargetPhase] = useState<1 | 2>(2);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = (name: string) => {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelected(next);
  };

  const run = () => {
    setError(null);
    try {
      const targets: DemandTarget[] = dataset.operators
        .filter((o) => selected.has(o.name))
        .map((o) => ({ info: o, targetPhase }));
      if (targets.length === 0) {
        setResult(null);
        setError('请至少选择一名目标干员。');
        return;
      }
      const demand = buildDemand(targets, dataset);
      setResult(planFarming({ demand, depot, dataset }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
    }
  };

  const ownedSelected = owned.filter((o) => selected.has(o.name)).length;

  return (
    <div className="panel">
      <section className="card">
        <h2>目标干员</h2>
        {owned.length === 0 ? (
          <EmptyHint>box 为空：请先在「导入」页录入干员（或载入示例 box）。</EmptyHint>
        ) : (
          <>
            <div className="row">
              <label className="inline-label">
                目标阶段
                <select value={targetPhase} onChange={(e) => setTargetPhase(Number(e.target.value) as 1 | 2)}>
                  <option value={1}>精一</option>
                  <option value={2}>精二</option>
                </select>
              </label>
              <button
                className="btn btn-ghost"
                onClick={() => setSelected(new Set(owned.map((o) => o.name)))}
              >
                全选已拥有
              </button>
              <span className="muted">
                已选 {ownedSelected} / {owned.length}
              </span>
            </div>
            <div className="check-grid">
              {owned.map((o) => (
                <label key={o.name} className="check-item">
                  <input
                    type="checkbox"
                    checked={selected.has(o.name)}
                    onChange={() => toggle(o.name)}
                  />
                  <RarityBadge rarity={o.rarity} /> {o.name}
                  <span className="muted small">
                    （精{box[o.name]!.elite}·{box[o.name]!.level} 级）
                  </span>
                </label>
              ))}
            </div>
            <div className="row">
              <button className="btn btn-primary" onClick={run}>
                开始规划
              </button>
            </div>
          </>
        )}
      </section>

      {error ? <div className="error">{error}</div> : null}

      {result ? (
        <section className="card">
          <h2>规划结果</h2>
          <div className="plan-total">
            预计总理智：<strong>{result.totalSanity}</strong>
            <span className="muted">（样例数据，仅供演示）</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>材料</th>
                  <th>需求</th>
                  <th>库存</th>
                  <th>建议合成</th>
                  <th>需刷取</th>
                  <th>推荐关卡</th>
                  <th>次数</th>
                  <th>理智</th>
                </tr>
              </thead>
              <tbody>
                {result.lines.map((l) => (
                  <tr key={l.materialId}>
                    <td>{l.name}</td>
                    <td>{l.need}</td>
                    <td>{l.have}</td>
                    <td>{l.craftSuggestion > 0 ? `合成 ${l.craftSuggestion}` : '—'}</td>
                    <td>{l.toFarm}</td>
                    <td>{l.stageCode ?? '—'}</td>
                    <td>{l.runs ?? '—'}</td>
                    <td>{l.sanity ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.stageSummary.length > 0 ? (
            <>
              <h3>跑图清单</h3>
              <ul className="stage-list">
                {result.stageSummary.map((s) => (
                  <li key={s.code}>
                    <strong>{s.code}</strong>：{s.runs} 次，共 {s.sanity} 理智
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <WarningsList warnings={result.warnings} />
          <p className="muted small">
            合成建议只使用当前库存做单级合成（不链式展开），关卡按“每单位理智期望产出”择优；
            语义细节见 README 路线图。
          </p>
        </section>
      ) : null}
    </div>
  );
}
