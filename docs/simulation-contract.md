# 纯函数教学模拟状态约定

`simulate(exp, params, time, action)` 是纯函数：相同输入返回相同读数、现象和场景状态，不写入全局状态。`params` 是控件当前值；选择器用数字索引表示，标签从 `exp.parameters[].options` 读取。模型先按 `sceneVariant`，再结合标题、器材识别具体装置。未知变体按所属 family 的明确教学默认模型处理，并在 `warnings` 说明。

通用状态字段：`phase`（阶段文本）、`progress`（0–1）、`active`（是否正在运行/反应）。物理字段沿用任务约定：`motion` x/velocity/acceleration/angle；`measurement` length/volume/mass；`density` density/mass/volume/material；`sound` amplitude/frequency/air；`optics` angle/reflectionAngle/refractionAngle/refractiveIndex；`lens` focalLength/objectDistance/imageDistance/magnification/virtual；`force` force/extension/friction；`mechanics` armLeft/armRight/forceLeft/forceRight/torqueLeft/torqueRight/balanced；`pressure` pressure/depth/density；`buoyancy` buoyancy/tension/volume/submerged/density；`heat` temperature/boilingPoint/phase/meltFraction/power；`electricity` voltage/current/resistance/power/closed/circuitType；`magnetism` field/strength/angle/poles/turns；`particle` speed/count。化学状态提供 `liquidColor`、`precipitateColor`、`gas`、`bubbles`、`flame`、`amount`、`pH`、`solubility`、`dissolved`、`undissolved` 等与现象有关字段。状态可包含额外的场景字段，供 Three rig 绘制。

常用补充字段：透镜在焦点时用 `imageAtInfinity: true` 且 `imageDistance: 0` 表示没有有限像距；实像放大率为负，虚像为正。电路可使用 `bulbOn`、`shortCircuit`、`circuitType`、`closed`；浮力包含实际浸入体积、液体密度与物重。化学状态可包含 `formula`、`flameColor`、`smoke`、`sparks`、`precipitate`、`cloudiness`、`temperatureChange`、`solidRetained`、`distillate`、`crystals`、`concentration` 等场景参数。色值字段使用语义字符串，不代表标准 CSS 色值。

`readings` 的数值文本带与参数/教材一致的单位。有限精度的简化力学关系标记 `quantitative`；主要定性关系标记 `qualitative`；粒子、示意或未提供足够参数时标记 `schematic`。化学不报告伪造的速率、浓度或精确产率。模型限制仍由 `exp.model.limits` 在 UI 展示。

`getSimulationCoverage()` 汇总当前实验数、sceneVariant 数、逐 family 数量和未登记变体。登记只表示有模拟分支，不代表定量覆盖。新增变体须先增加具体分支，再登记到 `src/sim/coverage.ts`；未登记时 `simulate()` 会附加 warning 并把 fidelity 降为 `schematic`。每条实验仍须结合自己的 `Observation.fidelity` 与 warning 判断精度。

动作计数来自 `ActionState.counts`。`toggle` 依 `counts.toggle` 奇偶切换；`run`、`add`、`ignite` 等动作只改变对应实验的阶段/可见现象；清空动作与初始参数保持一致。时间只用于连续且教学上有依据的进度，不将其解释成真实反应速率。所有输出数值均有限。

## 本批条件状态补充

燃烧/制气分支必须服从实验条件控件：电解水的 `power` 断开时 `bubbles=0`；`electrolyte` 会标记导电条件。氢气燃烧实验同时读取 `gas` 与 `purity`，`pure=false` 时不显示火焰或水生成；铁丝燃烧的 `protection` 未选少量水时在 `warnings` 提示防止集气瓶炸裂。碳还原氧化铜只在加热选项启用后显示反应。二氧化碳装置设计的 `heating` 影响方案说明，但设计态本身不伪造产气。木炭/木块燃烧依赖 `oxygen` 条件。

化学状态补充：`stage` 表示教材给定操作阶段；水的组成实验区分电解与产物检验，氢氧化钠区分固体观察、外加水溶解和（若选项提供）空气吸湿潮解。`electrolyte`、`acid`、`material`、`test` 等选项回写状态供场景呈现。蜡烛产物实验用 `detectedProduct` 标出器材实际检验的产物；镁燃烧质量实验用 `systemBoundary`、`oxygenIncluded`、`massBefore`、`massAfter` 描述称量边界，不把只称固体的质量增加误说成总质量不守恒。

物理补充：`noise` 的 `signal` 决定 `signalType` 与规则/不规则波形；`balance` 的 `mass` 与砝码、游码合计比较后给出 `balanced`。温度计 `depth` 为零时返回 `immersed=false` 并附无效读数警告；电流表超过量程时返回 `overload=true` 与警告。电动机 `commutator` 影响 `continuousRotation`：每半周换向可维持转动方向，没有换向则不能持续同向转动。

纸筒模型照相机（历史variant名pinhole-paper-camera）实际器材含凸透镜，使用固定示例焦距10cm的薄透镜调焦模型，不当作无透镜小孔。state.imageDistance是理论清晰像距，screenDistance是用户实际镜屏距，defocus决定模糊。10cm为演示设定，并非声称教材器材实测焦距。

浮力测力计示例物块固定质量300g；阿基米德/排水变量装置使用全体积100cm³，volume参数表示排开体积，state.submerged表示相应浸入比例。该质量和尺寸是演示设定，界面现象文字明确说明，不代表教材实测值。
