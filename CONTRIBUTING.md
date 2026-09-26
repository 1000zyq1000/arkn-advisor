# 贡献指南

感谢关注「方舟培养参谋」！本项目的一个重要原则是**诚实优先**：数据来源可追溯、评分假设可讨论、演示数据不冒充真实数据。请带着这个原则贡献。

## 环境准备

```bash
# Node.js >= 20（见 .nvmrc）
npm install
npm run dev      # 开发
npm test         # 测试
npm run lint     # ESLint
npm run build    # 类型检查 + 构建
```

提交 PR 前，请确保以上四项全部通过（CI 会同样执行）。

## 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)：`feat:` / `fix:` / `docs:` / `refactor:` / `test:` / `chore:`。

## 如何修改样例数据

样例数据位于 `src/data/`，约定见 [src/data/README.md](src/data/README.md)。要点：

- 所有交叉引用（干员消耗 → 材料ID、关卡掉落 → 材料ID、合成配方）由 `tests/data.test.ts` 保证完整；
- `_meta.source` 必须保持 `SYNTHETIC_SAMPLE`——这是 UI 提示横幅的开关，**不得移除**，除非数据集整体替换为已核实来源；
- 调整推荐权重请改 `src/lib/goals.ts`，并在 PR 中说明理由。

## 如何接入真实数据源（适配器规范）

1. 在 `src/lib/` 新增适配器模块，产出 `Dataset` 结构（见 `src/lib/types.ts`）；
2. 数据来源、抓取方式、许可协议必须写进适配器文档注释，并在 [NOTICE.md](NOTICE.md) 登记；
3. 数据集的 `isSample` 必须如实设置（真实数据为 `false`，UI 横幅自动消失）；
4. 为适配器提供测试与真实样例 fixtures；
5. 涉及网络请求的适配器必须有超时与降级策略（回退到样例数据并明确提示）。

## 如何核实并接入 MAA 导出格式（当前最高优先级）

MAA 适配器目前为 TODO（`src/lib/import/index.ts` 中 `status: 'todo'`）。这是**有意的保守设计**：在格式被独立核实之前，不提供猜测实现。核实步骤：

1. 从 MAA 官方渠道（GitHub Release 的源码包，或 `git clone` 对应 tag）获取与用户实际版本一致的源码；
2. 在 GUI 侧定位「工具箱 / 识别导出」相关实现（ViewModel 层），在 Core 侧定位干员识别（`OperBoxRecognitionTask`）与仓库识别（`DepotRecognitionTask`）的回调序列化代码；
3. **引用文件路径与行号**，记录导出 JSON 的确切字段结构；
4. 开 Issue 附上引用与本地实测导出的样例 JSON（脱敏后），经讨论确认；
5. 实现适配器 + fixtures + 测试，并在文档中声明兼容的 MAA 版本号。

> 经验教训：本项目开发过程中，曾因工具输出不可靠而差点基于未核实的格式实现适配器。任何“看起来很像”的格式都不算数——以官方源码引用 + 实测导出样本为准。

## 报告问题

Issue 请包含：浏览器与版本、复现步骤、控制台报错（如有）、导入的 JSON 样例（脱敏）。功能建议请说明目标玩法与预期输出形态。
