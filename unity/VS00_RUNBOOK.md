# VS-00 L01 初始化运行手册

## 当前环境结论

当前执行环境没有 `unity`、`Unity`、`UnityHub` 或 C# 编译器。已完成的文本配置可审阅，但不能声称 Unity 场景已生成、脚本已编译或 iPhone 构建已通过。

## 编辑器可用后的最短路径

1. 在 Unity Hub 安装已批准的 Unity 6 LTS 补丁和对应 Xcode。
2. 用 URP 模板创建临时空项目，关闭编辑器。
3. 将 `unity/Assets`、`unity/Packages`、`unity/ProjectSettings/CONFIG_CHECKLIST.md` 和 `unity/Assets/Scenes/SCENE_PLACEHOLDERS.md` 合并到项目；保留 Unity 自动生成的 `.meta` 和 `ProjectSettings.asset`。
4. 合并 `unity/Packages/manifest.json`，打开项目并让 Package Manager 生成 `packages-lock.json`。若版本不兼容，记录批准后的版本对并更新 manifest notes，不要无记录地升级。
5. 创建 `Boot`、`MainMenu`、`Hub`、`L01`、`ReplaySandbox` 场景，按占位说明挂载脚本。
6. 在 `L01` 场景中把 `Assets/Settings/Levels/L01.json` 作为 `TextAsset` 赋给 `L01VerticalSliceBootstrap.definitionJson`；挂载 `DeterministicTickClock`，运行 Play Mode，用 A/D 或方向键验证移动。
7. 通过 `UNITY_BIN=/path/to/Unity ./bootstrap_project.sh --check-only` 记录编辑器版本，再执行 VS-00 的 iPhone archive/install smoke。

## L01 过渡骨架预期行为

- 起点、机关、门和终点按源 HTML 的像素坐标以 0.01 比例转换为 Unity 单位。
- 玩家移动输入在 30 Hz Tick 中推进；历史记录在每个 Tick 写入。
- 90 Tick 后显示影子（源实现 180 帧、约 3 秒）；影子压住 `plate_a` 时 `gate_a` 打开。
- 玩家到达 `exit_a` 后在 Console 输出完成消息。该脚本暂不承担生产碰撞、跳跃、UI、本地化、存档或真实触控；这些由 VS-01 至 VS-08 接替。
