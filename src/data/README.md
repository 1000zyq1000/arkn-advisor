# 数据目录说明

本目录存放应用运行所需的静态数据集。**当前全部为内置合成样例数据**，用于跑通完整功能链路与演示 UI。

## 文件清单

| 文件 | 内容 |
| --- | --- |
| `sample-materials.json` | 材料表（含合成配方，配方比例为虚构） |
| `sample-operators.json` | 干员表（名称/职业/稀有度为公开常识，tags 为演示用标注） |
| `sample-evolution-costs.json` | 按稀有度的精英化消耗模板（数值虚构） |
| `sample-stages.json` | 关卡掉落与理智（关卡名带「样例」前缀，数值虚构） |

## 数据约定

1. **`_meta.source` 必须为 `SYNTHETIC_SAMPLE`**。应用（`src/lib/data.ts`）据此在 UI 上展示「样例数据」提示横幅，这是诚实性的硬约束：只要数据未经真实来源核实，就必须让用户看见。
2. 材料引用使用 `materialId`；所有被干员消耗、关卡掉落、合成配方引用的 `materialId` 必须在 `sample-materials.json` 中存在（有单元测试保障：`tests/data.test.ts`）。
3. `craft.inputs` 语义为「消耗 inputs 合成产出 1 个该材料」。规划器 v1 只做单级合成，不做链式展开。

## 接入真实数据源

真实数据（MAA 导出、企鹅物流、一图流、PRTS 等）一律通过适配器接入，**不直接改写本目录的样例文件**：

1. 在 `src/lib/` 下新增数据适配器模块，产出 `Dataset` 结构（见 `src/lib/types.ts`）；
2. 适配器必须注明数据来源、抓取/生成方式与对应的许可协议，并在根目录 `NOTICE.md` 登记；
3. 修改 `src/lib/data.ts` 的加载逻辑或提供数据集切换入口；
4. 为适配器编写测试与真实样例 fixtures；
5. 接入后从 `Dataset.isSample = false`，UI 横幅自动消失。

## 版权提醒

游戏内的干员名、材料名、关卡名等版权归属于上海鹰角网络科技有限公司 / Yostar。本项目不打包任何游戏美术资源（立绘、图标、语音等）；接入官方派生数据时，请确认该数据来源的再分发许可，并在 `NOTICE.md` 中登记。
