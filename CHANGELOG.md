# 更新日志

本项目的所有重要变更记录在此文件中。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本遵循语义化版本。

## [0.1.0] - 2026-09-26

### Added

- **培养推荐**：按玩法预设（主线推图 / 高难合约 / 肉鸽 / 保全派驻）的透明评分（`价值 ÷ 剩余成本`）与逐条理由
- **养成规划**：材料需求 → 扣库存 → 单级合成建议 → 按“每单位理智期望产出”的刷图规划与理智汇总
- **导入**：通用宽容 JSON（字段别名自动匹配、越界钳制、重复条目提示）+ 手动 box 编辑 + 一键示例数据
- **内置样例数据集**：全部标注 `SYNTHETIC_SAMPLE`，UI 常驻横幅提示，测试锁定该声明
- **测试**：52 个单元 / UI 冒烟用例（jsdom 全流程）；覆盖率报告（门槛待 CI 实测基线后设定）
- **工程**：Vite + React 18 + TypeScript strict；ESLint 9；CI（lint / test / coverage / build）；GitHub Pages 部署工作流；错误边界；localStorage 本地持久化

### 安全与诚实性设计

- 在第三方格式与数据未经独立核实前，不提供任何“猜测实现”（MAA 适配器为显式 TODO，核实步骤见 CONTRIBUTING.md）
- 纯本地计算，不上传任何数据
