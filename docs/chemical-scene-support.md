# 化学实验 3D 场景支持

`ChemicalRig` 为两个化学册的 80 个 `sceneVariant` 提供了渲染路由。它们归并为若干装置族；只有下表“专用装置”中列出的变体有单独的几何布局。其余变体共享器材模板，通过标题、设备标签和可读取的模型状态区分。它们不是 80 套独立的科学仿真。

液体、沉淀、气泡、火焰、传感器指示和电解气体量尽可能读取 `Observation.state`、参数与动作计数；运动使用暂停友好的 `useRig` 实验时间。没有对应模型字段的视觉仍是静态或定性示意。

## 场景族与变体

| 装置族 | 覆盖的 sceneVariant | 场景内容 |
|---|---|---|
| 加热与物态 | `water-boiling-condensation`, `wax-water-bath`, `dissolution-temperature-change`, `sulfuric-acid-dilution`, `sodium-hydroxide-dissolution`, `quicklime-water-exothermic` | 水浴/试管、温度计、灯焰和样品；温度与加热状态驱动示意。 |
| 发生、收集与气体检验 | `marble-acid-open-tube`, `carbonate-powder-acid`, `permanganate-water-collection`, `peroxide-catalyst`, `oxygen-preparation-practical`, `co2-apparatus-design`, `co2-preparation-properties-practical`, `carbonate-acid-limewater`, `soda-acid-co2-extinguisher`, `oxygen-supply-device-design`, `oxygen-carbon-dioxide-splint`, `glowing-splint-oxygen`, `co2-extinguishes-candles`, `co2-bottle-pressure`, `metals-acid-hydrogen` | 发生瓶/试管、玻璃导管、集气瓶或检验器皿；CO₂、O₂等按对应模型状态呈现。 |
| 沉淀、热分解与反应 | `copper-hydroxide-precipitate`, `copper-hydroxide-heating`, `carbon-reduces-copper-oxide`, `hydrogen-combustion-water`, `sodium-carbonate-limewater`, `copper-sulfate-precipitates`, `neutralization-phenolphthalein`, `acid-base-properties-practical` | 滴加/试管反应、沉淀与加热器材；颜色读取安全色名映射。 |
| 指示剂 | `limewater-phenolphthalein`, `indicators-acid-base`, `acid-indicator-materials`, `acid-properties-comparison`, `base-properties-comparison`, `co2-water-litmus`, `soil-ph-plant-growth` | 滴管、试管和对照溶液；指示剂颜色显示由模型 `liquidColor` 驱动。 |
| 燃烧与产物检验 | `candle-products-smoke`, `phosphorus-air-volume`, `combustion-conditions-phosphorus`, `carbon-burning-oxygen`, `sulfur-burning`, `iron-sparks-oxygen`, `methane-products`, `wood-coal-ignition` | 燃烧匙/集气瓶、导气管、石灰水检验；硫的气氛颜色和铁的黑色固体有简洁标签说明。 |
| 粒子与扩散 | `dye-diffusion-water`, `ammonia-diffusion-phenolphthalein` | 液体容器与粒子云，位置使用暂停友好的实验时间。 |
| 电解与导电 | `water-electrolysis`, `water-composition-change-practical`, `acid-solution-conductivity` | 电源、电极、双管、灯泡和 H₂:O₂ 体积柱；未导电/未通电时无电解气体。 |
| 测量、质量守恒与装置设计 | `solid-reagent-transfer`, `oxygen-sensor`, `air-quality-sensor-station`, `mass-conservation-open-closed`, `magnesium-combustion-mass`, `mass-conservation-experiment`, `ph-paper-measurement`, `household-ph-measurement`, `acid-appearance`, `alloy-hardness-scratch`, `prepare-sodium-chloride-solution` | 取样工具、传感器屏幕、天平/封闭容器、量筒或样品台；读数保持教学示意。 |
| 过滤、蒸馏、溶解与结晶 | `glassware-cleaning`, `alum-flocculation-settling`, `gravity-filtration`, `water-distillation`, `charcoal-adsorption-dye`, `water-quality-filter-design`, `crude-salt-purification`, `sugar-dissolution-water`, `iodine-permanganate-solvent`, `water-ethanol-oil-mixing`, `sodium-chloride-solubility`, `potassium-nitrate-solubility`, `salinity-concentration-comparison`, `prepare-saline-by-mass`, `calcium-hydroxide-solubility`, `solubility-temperature-curve` | 漏斗与滤纸锥、蒸馏冷凝管、溶液/晶体容器及称量器材。 |
| 金属与腐蚀 | `alloy-hardness-scratch`, `metals-oxygen-comparison`, `metal-displacement-copper-sulfate`, `iron-rust-conditions`, `metal-properties-practical` | 金属样条与溶液；置换颜色作为固体表面变化示意。 |

## 专用装置与近似场景

以下是确有不同几何或动态响应的装置分支：

- `permanganate-water-collection`：加热试管、导气管、水槽和倒置集气瓶。
- `peroxide-catalyst`：常温锥形瓶、催化剂示意和导气收集装置。
- `co2-apparatus-design`, `co2-preparation-properties-practical`, `carbonate-acid-limewater`：常温制气瓶与向上排空气集气；`marble-acid-open-tube`, `carbonate-powder-acid` 使用敞口试管观察气泡。
- `co2-extinguishes-candles`：高低两支蜡烛，分别读取低处和高处火焰状态。`candle-products-smoke` 使用蜡烛和检验器皿。
- `gravity-filtration`, `water-quality-filter-design`, `crude-salt-purification`：漏斗、滤纸锥、滤渣和按状态显示的滤液滴；`glassware-cleaning` 使用独立的试管刷洗与试管架。
- `water-distillation`：蒸馏瓶、冷凝管和接收瓶。
- `water-electrolysis`, `water-composition-change-practical`：电源、电极、双管和读取模型 `hydrogenVolume` / `oxygenVolume` 的气体柱。
- `mass-conservation-open-closed`, `mass-conservation-experiment`, `magnesium-combustion-mass`：双盘天平与随 `closed` 状态显示的密闭盖。
- `solid-reagent-transfer`：按 `material` 切换块状/粉末示意，试管倾角读取 `tilt`。
- `ph-paper-measurement`, `household-ph-measurement`：试纸颜色与pH读数；生活样品缺少实际 pH 时显示待测状态。
- `soil-ph-plant-growth`：土壤盆栽与探针示意。
- `co2-bottle-pressure`：软瓶横向形变读取 `bottleDeformation`。

其他反应、金属、浓度配制、传感器和燃烧变体目前共享相应家族的基础模型。示例读数不代表真实传感器；金属锈蚀与置换、沉淀分离、晶体形态和火焰细节仍是低模提示。配制溶液没有真实称量刻度。若模拟模型未提供未溶量、结晶量或反应阶段字段，器材只保留初始示意，不会自行推算精确数量。

## 简化与科学边界

- 这是低模纸雕风格，不模拟精确试剂体积、反应速率、沉降粒径或真实火焰温度。粒子、晶体、滤渣和传感器界面只表达观察关系。
- 过滤、传感器、天平和装置设计保留部分关键结构；刻度、显示读数与几何比例是示意。
- 电解气体体积柱读取 `hydrogenVolume`、`oxygenVolume`，并按模型的 2:1 比例显示。模型未产生气体时柱体隐藏。
- 指示剂及沉淀颜色使用有限安全映射；未知状态色回退至浅蓝玻璃液体色，不传给 Three.js 作为非法颜色字符串。
- 模拟器模型决定是否反应；装置不额外推断未加热还原、未通电电解或未满足条件的燃烧。氢气火焰仅在模型同时标记纯度确认和燃烧阶段时显示。
