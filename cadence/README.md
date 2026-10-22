# Cadence 工程目录说明

本目录保存 RC-CAR 项目的 Cadence 设计源文件。车辆端和遥控器端分开管理，公共元器件库集中放在 `library` 中。

## 目录结构

| 目录 | 用途 |
|---|---|
| `library/symbols` | OrCAD Capture 原理图符号库，主要保存 `.olb` 文件。符号的引脚编号必须与 PCB 封装焊盘编号一致。 |
| `library/padstacks` | Cadence Padstack Editor 创建的焊盘库，主要保存 `.pad` 文件，包括贴片焊盘、通孔焊盘和安装孔。 |
| `library/footprints` | Allegro/OrCAD PCB Editor 的 PCB 封装库，保存可编辑的 `.dra` 和编译后的 `.psm` 文件。 |
| `library/step` | 元器件三维模型，主要保存 `.step` 或 `.stp` 文件，用于 PCB 3D 检查。 |
| `vehicle/schematic` | 车辆控制板的 OrCAD Capture 工程，保存 `.opj`、`.dsn` 及车辆板专用设计文件。 |
| `vehicle/pcb` | 车辆控制板的 PCB 工程，主要保存 `.brd` 文件及相关 PCB 设置。 |
| `controller/schematic` | 手持遥控器板的 OrCAD Capture 工程，保存 `.opj`、`.dsn` 及遥控器专用设计文件。 |
| `controller/pcb` | 手持遥控器板的 PCB 工程，主要保存 `.brd` 文件及相关 PCB 设置。 |

## 管理规则

- 公共符号、焊盘、封装和三维模型统一放入 `library`，不要复制到多个工程目录。
- 下载的第三方库在使用前必须核对尺寸、方向、引脚编号和焊盘编号。
- 不要把自建库放入 Cadence 安装目录，以免升级或重装时丢失。
- 在 PCB Editor 中将 `padpath` 指向 `library/padstacks`，将 `psmpath` 指向 `library/footprints`。
- 车辆板和遥控器板分别建立工程，避免原理图和 PCB 文件混用。

