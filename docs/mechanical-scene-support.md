# 物理力学 3D 场景覆盖

`MechanicsRig` 按 `sceneVariant` 明确分发装置。未知变体返回 `null`，不显示冒名器材。

| Family | sceneVariant | 3D场景 | 覆盖说明 |
|---|---|---|---|
| measurement | `ruler` | 刻度尺、铅笔、视线和刻度读数 | 视差读数取模型状态；尺上刻度为示意比例 |
| measurement | `stopwatch` | 秒表表盘与摆 | 表针使用模型累计时间，摆动周期随参数变化 |
| motion | `ramp-speed` | 可调斜面和小车 | 倾角及 run 过程驱动车位置；时间比例作视觉演示 |
| motion | `friction-cart` | 小车与粗糙水平板 | 末速度影响 run 位移；耗散系数来自模型 |
| motion | `kinetic-energy` | 钢球斜槽和被撞木块 | 质量、释放高度和模型速度影响球尺寸/位置及木块位移 |
| force | `funnel-pingpong` | 倒置漏斗托球 | 气流和球隙改变球位置，属流场定性模型 |
| force | `spring-scale` | 弹簧测力计、钩码及独立弹簧 | 拉力驱动读数；劲度系数影响弹簧伸长示意 |
| force | `gravity-mass` | 竖直测力计与钩码 | 质量、重力加速度驱动重力示值 |
| force | `two-force-balance` | 两侧拉绳小车 | 左右力与偏转驱动小车偏移/转角 |
| force | `collinear-forces` | 共线拉力合成小车 | 方向、两分力及合力驱动偏移；合成显示定性 |
| force | `sliding-friction` | 木块、木板和横置测力计 | μN 控制测力计与 run 位移 |
| force | `door-lever-arm` | 带铰链的门 | 作用点位置和推力驱动门转角 |
| force | `magnet-ball` | 磁体、铁球和轨道 | 磁体坐标、强度驱动球位置示意 |
| force | `action-reaction-carts` | 两辆磁体小车 | 磁体间距和 run 驱动相背运动 |
| density | `balance` | 托盘天平、砝码、游码 | 质量差影响梁倾斜；砝码/游码参数改变位置或尺寸 |
| density | `mass-volume` | 铝、铁或木样品 | 材料选项改变样品材质，体积改变几何，读数按材料密度估算 |
| density | `liquid-density` | 量筒、盐水和天平 | 体积改变液位；密度与体积改变砝码块比例 |
| density | `displacement` | 量筒、浸入石块和天平模型 | 体积改变液位/石块高度，质量改变石块尺寸 |
| density | `mini-hydrometer-project` | 液体中的密度计 | 液体密度改变浸入深度，配重改变倾角 |
| pressure | `sponge-table` | 海绵、小桌和载荷 | 压力/受力面积影响海绵压痕示意 |
| pressure | `liquid-probe` | 水槽、探头和U形管 | 深度/密度影响U管液差；探头朝向可转动 |
| pressure | `torricelli` | 倾斜玻璃管、水银示意槽及竖直标尺 | 气压改变柱高，倾角改变管向；汞仅作虚拟材质示意 |
| pressure | `homemade-barometer` | 密封瓶、细管和有色水 | 气压/密封程度改变液柱高度 |
| pressure | `piston-pump-project` | 活塞筒、进出水管和单向阀 | 行程、密封和运行时间改变活塞/水流示意 |
| pressure | `airflow-paper` | 两纸片与气流 | 间距、气流速度改变纸片弯曲示意 |
| buoyancy | `weighing` | 测力计、水槽和悬挂物块 | 浸入比例影响位置；浮力和拉力来自模型读数 |
| buoyancy | `variables` | 测力计、水槽和物块 | 排开体积影响浸入程度；密度影响模型示值 |
| buoyancy | `archimedes` | 测力计、物块、溢水杯 | 模型体积控制接水量，浮力与张力显示模型读数 |
| buoyancy | `egg-water-salt` | 水槽和鸡蛋 | 液体/鸡蛋密度比较决定浮沉位置 |
| buoyancy | `clay-boat` | 水槽、橡皮泥船和载荷 | 吃水/载荷改变船位与倾斜 |
| mechanics | `lever` | 支点、刻度杆和挂码 | 力与力臂共同决定杆倾角 |
| mechanics | `steelyard-project` | 秤盘、提纽、秤杆和秤砣 | 质量改变秤杆姿态，秤砣力臂改变滑块位置 |
| mechanics | `pulley-types` | 定滑轮与动滑轮对照 | 两类装置同时展示以便比较；载荷/提升高度改变挂码位置 |
| mechanics | `pulley-work` | 动滑轮、提升载荷与测力示意 | 高度、载荷、额外功比例影响运动/测力读数 |
| mechanics | `pulley-efficiency` | 滑轮组、提升载荷与测力示意 | 高度、载荷、效率影响运动/测力读数 |

所有模型是教材概念的比例化教学示意，不是精密流体、材料变形或工程受力仿真。装置尺寸刻意限制在书页空间内，数值单位不会直接换算为场景米制长度。
