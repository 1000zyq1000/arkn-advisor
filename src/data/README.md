# 数据目录说明

本目录存放应用运行所需的静态数据集，共两个来源，可通过 UI 顶部「数据源」切换：

## 真实数据集（默认）

由 `scripts/build-real-dataset.mjs` 从游戏数据提取仓库
（Kengxxiao/ArknightsGameData，master 分支）结构转换生成，**未修改、未虚构任何数值**；
来源 blob SHA 核验记录见根目录 `NOTICE.md`。

| 文件 | 内容 |
| --- | --- |
| `real-materials.json` | 全量材料（含加工站合成配方，数值为游戏真实值） |
| `real-operators.json` | 全量干员名单（名称/稀有度/职业/公招标签） |
| `real-operator-costs.json` | 按干员的精英化消耗（phase1/phase2，真实值） |
| `real-stages.json` | 主线与常驻资源关的理智消耗与掉落物列表 |

已知边界（同样写在各文件 `_meta.note` 中）：

1. **期望掉率不在游戏数据中**，`expectPerRun` 置 0 —— 刷图规划的次数/理智估算待企鹅物流等真实掉率来源接入后启用，绝不允许手工填入虚构掉率；
2. 干员精英化消耗不含龙门币（该数据版本的 phases 未随附，龙门币成本建模见项目路线图）；
3. 作战记录（经验）不掉落物不在建模范围（经验模型未建）；
4. 同名多形态干员（如阿米娅的多形态）仅保留基础形态。

## 样例演示数据集

| 文件 | 内容 |
| --- | --- |
| `sample-materials.json` | 材料表（含合成配方，配方比例为虚构） |
| `sample-operators.json` | 干员表（名称/职业/稀有度为公开常识，tags 为演示用标注） |
| `sample-evolution-costs.json` | 按稀有度的精英化消耗模板（数值虚构） |
| `sample-stages.json` | 关卡掉落与理智（关卡名带「样例」前缀，数值虚构） |
| `sample-challenge-stages.json` | 挑战型关卡与机制标注（演示用） |

## 数据约定

1. **`_meta.source` 是诚实性开关**：真实数据集为 `GAME_DATA`，样例数据集为 `SYNTHETIC_SAMPLE`。应用（`src/lib/data.ts`）据此展示「样例数据」提示横幅 —— 只要数据未经真实来源核实，就必须让用户看见。
2. 材料引用使用 `materialId`；所有被干员消耗、关卡掉落、合成配方引用的 `materialId` 必须在对应材料文件中存在（有单元测试保障：`tests/data.test.ts`，两个数据集分别成套）。
3. `craft.inputs` 语义为「消耗 inputs 合成产出 1 个该材料」；规划器支持链式合成（原料缺口递归展开）。
4. `expectPerRun` 语义为「每次通关期望产出」：样例数据为虚构值；真实数据集必须为 0（待真实掉率接入），测试已锁定。

## 再生方式

```bash
# 先取得游戏数据文件与 manifest（见 NOTICE.md 的来源与核验记录），然后：
node scripts/build-real-dataset.mjs --from <数据文件目录>
```

## 版权提醒

游戏内的干员名、材料名、关卡名等版权归属于上海鹰角网络科技有限公司 / Yostar。本项目不打包任何游戏美术资源（立绘、图标、语音等）；数据表仅作社区工具用途引用，来源与许可状态在 `NOTICE.md` 中如实登记。
