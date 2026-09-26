# NOTICE — 版权与数据来源声明

## 代码

本项目代码以 MIT 协议开源（见 [LICENSE](LICENSE)）。

## 游戏相关名称与术语

「明日方舟」、干员名、材料名、关卡名等游戏内名称与术语的版权归 **上海鹰角网络科技有限公司 / Yostar** 所有。本项目为社区工具，与权利方无隶属关系；**不打包、不分发任何游戏美术资源**（立绘、图标、语音等）。

## 内置样例数据

`src/data/` 下的数据集为**本项目自行编写的合成样例**（标注 `_meta.source = "SYNTHETIC_SAMPLE"`）：材料名与干员名采用公开常识信息，但配方比例、掉率、消耗数值均为虚构，不代表游戏内真实数据。

## 第三方数据源登记表

接入任何第三方数据源之前，必须确认其许可允许本项目用途，并在下表登记核实结果。

| 数据源 | 许可 | 用途 | 状态 |
| --- | --- | --- | --- |
| MAA（MaaAssistantArknights） | 代码 AGPL-3.0（GitHub API 核实） | 导出 JSON **格式**参考：本地解析用户自己的导出文件；不复制、不链接、不分发其代码 | 格式已核实，适配器已接入（v0.4.0） |
| 游戏数据提取（Kengxxiao/ArknightsGameData） | 仓库**未声明许可**；数据版权归上海鹰角网络科技 / Yostar | 真实数据集的数值来源：干员名单、材料、合成配方、精英化消耗、关卡理智与掉落物列表（不含任何美术资源） | 已接入（v0.5.0，blob SHA 核验） |
| 企鹅物流数据统计（penguin-statistics） | 组织内代码多为 MIT（`backend-next`、`frontend-v2`、`ArkPlanner` 均为 MIT）；线上 API 与数据**未见书面条款** | 计划：真实掉率与刷图效率（**尚未接入**） | API 可用性与 CORS 已实测（2026-09-26），未接入 |
| 一图流（yituliu） | 核心仓库 `BackEndV3` / `frontend-v3` **均未声明许可**（无 LICENSE 文件）；API **无书面条款** | 计划：养成效率数据（**尚未接入**） | API 可达性与 CORS 已实测（2026-09-26），未接入 |

## 游戏数据提取核实记录（2026-09-26，v0.5.0 接入）

- 来源仓库：https://github.com/Kengxxiao/ArknightsGameData （master 分支，社区维护的游戏数据提取；**仓库未声明许可**，数据版权归上海鹰角网络科技有限公司 / Yostar 所有）。仓库 2026-09-20 仍有更新（随游戏版本维护）。
- 使用的文件（zh_CN/gamedata/excel/）及核验：`character_table.json`（`62d81cb4…`）、`item_table.json`（`c5322d45…`）、`building_data.json`（`6a61e7fb…`）、`stage_table.json`（`295aaf42…`）。下载经 jsDelivr CDN，本地 `git hash-object` 与 GitHub blob SHA **逐文件对账一致**；完整清单见 `src/data/real-*.json` 的 `_meta` 与 `scripts/build-real-dataset.mjs`。
- 转换原则：`scripts/build-real-dataset.mjs` 只做结构转换与过滤，**不修改、不虚构任何数值**；期望掉率不在游戏数据中（置 0，不虚构）；干员精英化消耗不含龙门币（该数据版本未随附，如实缺失）。
- 许可说明：本仓库未声明许可，本项目的使用方式为社区工具惯例 —— 仅引用数据表、不打包美术资源、显著注明归属、不用于商业用途；如权利方提出异议即移除。

## MAA 导出格式核实记录（2026-09-26）

- 官方仓库：https://github.com/MaaAssistantArknights/MaaAssistantArknights ，许可 AGPL-3.0，默认分支 `dev-v2`（GitHub API 双通道核实一致）。
- 核实对象：**tag `v6.18.0`**（注解标签，对象 SHA `5af3a45631f3e89c77e83329fe8137beac85c106`）。
- 完整性校验：
  - 官方 codeload 源码包（`tar.gz/refs/tags/v6.18.0`）与本地留存包 **SHA-256 完全一致**（`8991d485e90d2e6edd86b1ebb13298a618dcf898565b5d5a9f9c63b1d00aaa8d`）；
  - 4 个关键文件经 GitHub contents API 下载，本地 `git hash-object` 与 API 报告的 blob SHA 全部一致；
  - tar 包内 `.cs` 文件因仓库 `.gitattributes`（`*.cs text eol=crlf`）呈 CRLF，与 blob（LF）仅行尾差异，`diff --strip-trailing-cr` 逐字一致。
- 干员识别导出格式依据（文件 + 行号）：
  - `src/MaaWpfGui/Models/OperBoxData.cs:20-80` —— 导出条目 schema：`{ id, name, elite, level, own, potential, rarity, mainSkillLevel?, skills?, equips? }`（后三项仅一图流数据源时出现）；
  - `src/MaaWpfGui/ViewModels/UI/ToolboxViewModel.cs:1956-2015` —— `BuildOperBoxExportList`：导出含**全量干员**（未拥有者 `own=false` 且无练度字段）；
  - `src/MaaWpfGui/ViewModels/UI/ToolboxViewModel.cs:2003-2015, 2043-2050` —— 剪贴板 / `.json` 文件导出为上述列表的**裸 JSON 数组**（Formatting.Indented）；
  - `src/MaaCore/Task/Miscellaneous/OperBoxRecognitionTask.cpp:61-104` —— Core 回调 `details = { done, all_opers, own_opers }`，`own_opers` 条目 `{ id, name, own, elite, level, potential, rarity }`；
  - `src/MaaWpfGui/ViewModels/UI/ToolboxViewModel.cs:1527-1541` —— GUI 内部存档信封 `{ done, own_opers, source, syncTime }`。
- 仓库识别导出格式依据（供「材料库存」入口粘贴参考）：
  - ArkPlanner：`{ "@type": "@penguin-statistics/depot", "items": [{ id, have, name }] }`（`ToolboxViewModel.cs:654-686`）；
  - Lolicon：`{ 材料ID: 数量 }`（`ToolboxViewModel.cs:691-719`）。
- 许可说明：本项目未复制 / 链接 / 分发 MAA 代码，仅按其公开导出格式实现独立解析器（`src/lib/import/maa.ts`），不构成 AGPL 义务的触发（无衍生作品分发）。

## 企鹅物流 / 一图流 API 实测记录（2026-09-26）

仅为**接入前侦察**，本项目当前未调用任何一方接口（应用保持纯本地计算）。实测发现如实登记：

- 企鹅物流（`penguin-statistics` 组织，35 个仓库清单落盘核对）：
  - 无 `backend-v4` 仓库；现行后端为 `backend-next`（Go，MIT，活跃），现行前端为 `frontend-v2`（MIT）。
  - 线上 API `GET https://penguin-stats.io/PenguinStats/api/v2/items`（带 `Origin: http://localhost:5173` 探测）：HTTP 200，合法 JSON，155 个条目；响应头 `access-control-allow-origin` 回显请求 Origin、`access-control-allow-credentials: true`、`cache-control: public, max-age=300` —— 浏览器端跨域读取技术上可行。
  - **缺口**：仓库与 README 中未见书面 API 使用条款 / 数据许可；接入前需向官方确认（或等待其公开条款）。
- 一图流（`Arknights-yituliu` 组织）：
  - 核心仓库 `BackEndV3`（Java/Spring，dev 分支活跃）与 `frontend-v3`（2023 年后未更新）**均无 LICENSE 文件**——按默认版权法，其代码不可复制 / 改编；`frontend-v2` 为 MIT（旧版）。
  - API 文档 `frontend-v3/docs/BackEndAPI.md` 仅描述旧版相对端点（`/api/find/stage/t3` 等，**已实测 404 下线**），且无任何许可 / 条款表述；`api.yituliu.cn` 主机 TLS 证书实为 `backend.yituliu.cn`（证书主体核对）。
  - 现行 API 实测：`GET https://backend.yituliu.cn/stage/info`（BackEndV3 `ItemControllerV7.java:43` 路由）HTTP 200，`{code:200, data:[...]}` 关卡效率数据；`access-control-allow-origin: *`。
  - **缺口**：API 无书面条款，站点域名（`yituliu.cn` / `www`）当前 DNS 不解析；接入前需确认官方意图与条款。

## 计划接入（须先完成核实）

- 企鹅物流数据统计（掉落数据）：API 技术可用性已核实；**待补**：书面 API/数据条款确认
- 一图流（养成效率数据）：API 可达性已核实；**待补**：书面条款确认、官方数据使用授权意向
- PRTS Wiki（干员资料；待确认）
