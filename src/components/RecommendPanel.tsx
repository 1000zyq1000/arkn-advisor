/** 推荐页：按玩法预设或目标关卡输出培养优先级（评分透明，展示理由）。 */
import { useState } from 'react';
import type { ChallengeStage, Dataset, OperBoxEntry } from '../lib/types';
import { GOAL_PRESETS } from '../lib/goals';
import { recommend } from '../lib/recommend';
import { RarityBadge, TagChips, EmptyHint } from './ui';

interface Props {
  box: Record<string, OperBoxEntry>;
  dataset: Dataset;
}

export default function RecommendPanel({ box, dataset }: Props) {
  const [presetId, setPresetId] = useState(GOAL_PRESETS[0]!.id);
  const [mode, setMode] = useState<'goal' | 'stage'>('goal');
  const [stageId, setStageId] = useState(dataset.challengeStages[0]?.id ?? '');
  const [results, setResults] = useState<ReturnType<typeof recommend>>([]);

  const preset = GOAL_PRESETS.find((p) => p.id === presetId)!;
  const stage: ChallengeStage | undefined =
    mode === 'stage' ? dataset.challengeStages.find((s) => s.id === stageId) : undefined;
  const maxScore = Math.max(...results.map((r) => r.score), 1);

  return (
    <div className="panel">
      <section className="card">
        <h2>目标场景</h2>
        <div className="preset-grid">
          {GOAL_PRESETS.map((p) => (
            <label key={p.id} className={`preset-card ${p.id === presetId ? 'active' : ''}`}>
              <input
                type="radio"
                name="preset"
                value={p.id}
                checked={p.id === presetId}
                onChange={() => setPresetId(p.id)}
              />
              <div>
                <strong>{p.label}</strong>
                <div className="muted">{p.description}</div>
              </div>
            </label>
          ))}
        </div>
        <div className="row" role="radiogroup" aria-label="推荐方式">
          <label className="check-item">
            <input
              type="radio"
              name="mode"
              checked={mode === 'goal'}
              onChange={() => setMode('goal')}
            />
            按玩法预设
          </label>
          <label className="check-item">
            <input
              type="radio"
              name="mode"
              checked={mode === 'stage'}
              onChange={() => setMode('stage')}
            />
            按目标关卡
          </label>
          {mode === 'stage' ? (
            <label className="inline-label">
              目标关卡
              <select value={stageId} onChange={(e) => setStageId(e.target.value)}>
                {dataset.challengeStages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} · {s.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <div className="row">
          <button
            className="btn btn-primary"
            onClick={() => setResults(recommend(box, preset, dataset, { topN: 10, stage }))}
          >
            生成推荐（Top 10）
          </button>
        </div>
      </section>

      <section className="card">
        <h2>推荐结果</h2>
        {stage ? (
          <p className="muted small">
            已叠加关卡「{stage.code}」的机制需求亲和（{stage.mechanics.join('、')}）。
          </p>
        ) : null}
        {results.length === 0 ? (
          <EmptyHint>
            先在「导入」页录入你的 box（或载入示例 box），选择“按玩法预设”或“按目标关卡”，再点击「生成推荐」。推荐会跳过已高练度的干员。
          </EmptyHint>
        ) : (
          <ol className="rec-list">
            {results.map((r) => (
              <li key={r.operator.name} className="rec-item">
                <div className="rec-head">
                  <RarityBadge rarity={r.operator.rarity} />
                  <strong>{r.operator.name}</strong>
                  <span className="muted">{r.operator.profession}</span>
                  <TagChips tags={r.operator.tags} />
                  <span className="score">{r.score.toFixed(2)}</span>
                </div>
                <div className="score-bar">
                  <div style={{ width: `${(r.score / maxScore) * 100}%` }} />
                </div>
                <ul className="reasons">
                  {r.reasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
        {results.length > 0 ? (
          <p className="muted small">
            评分为启发式模型（价值 × 机制亲和 ÷ 剩余成本），权重定义见 <code>src/lib/goals.ts</code>{' '}
            与 <code>src/lib/mechanics.ts</code>，欢迎通过 PR 调整。当前为样例数据，结论不可作为攻略依据。
          </p>
        ) : null}
      </section>
    </div>
  );
}
