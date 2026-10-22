# 阶段0：资料备份与工程准备

日期：2026-09-21  
项目：RC-CAR-V1.0  
目标：建立可追溯、可回退的 Cadence 设计环境。

## 自动核对结果

- [x] `cadence/library/symbols` 已建立。
- [x] `cadence/library/padstacks` 已建立，已有两个排针通孔 Padstack。
- [x] `cadence/library/footprints` 已建立。
- [x] `cadence/library/step` 已建立。
- [x] 车辆板原理图和 PCB 目录已分开建立。
- [x] 遥控器板原理图和 PCB 目录已分开建立。
- [x] `manufacturing/gerber`、`drill`、`assembly`、`bom` 已建立。
- [x] `test-records` 已建立。
- [x] 工程目录不位于 Cadence 安装目录、下载目录或临时目录。

## 待人工确认

- [x] Cadence 产品与版本：Cadence OrCAD X and Allegro X 24.1（24.1.0）。
- [ ] 许可证类型及状态：系统已配置 `CDS_LIC_FILE=5280@localhost`；Capture 已正常进入主界面，其余工具授权尚待确认。
- [x] 软件安装日期：2026-09-19；安装位置 `F:\Cadence\SPB_24.1`。
- [x] OrCAD X Capture 可以正常启动并进入主界面（用户于 2026-09-22 确认）。
- [ ] OrCAD X Capture 可以新建 PCB 工程并保存到车辆板目录。
- [ ] Padstack Editor 可以正常启动。
- [ ] OrCAD/Allegro PCB Editor 可以正常启动。
- [ ] `docs`、`software`、采购/BOM 和现有接线资料已备份到另一存储位置。

## 阶段0放行条件

只有上述待人工确认项目全部完成后，阶段0才可标记为“通过”，然后进入阶段1的实物尺寸、电流和针序冻结。

阶段结论：未放行  
执行人：____________________  
复核人：____________________
