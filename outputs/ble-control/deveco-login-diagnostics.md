# DevEco 登录回调修复记录

2026-10-22，DevEco Studio6.0.1.251。

症状：自动签名登录提示 `Failed to log in ... Network connection, HTTP Proxy`。

证据：

- idea.log 中 HiAiLoginService 每次登录连续三次记录 `can not create socket`。
- 华为开发者首页直连及使用当前本机HTTP代理均返回HTTP200；没有修改系统代理或IDE代理。
- 只读检查安装包的回调类确认使用Netty NIO创建127.0.0.1上的登录回调服务，首选端口10101；该端口未被占用，也不在Windows排除端口段。
- 使用DevEco自带JBR21.0.8执行独立Selector/ServerSocketChannel探针，复现 `Unable to establish loopback connection`，底层为 `UnixDomainSockets.connect: Invalid argument`。
- 设置 `-Djdk.net.unixdomain.tmpdir=C:/Users/Administrator/.deveco-tmp` 后，同一探针成功创建Selector、绑定127.0.0.1:10101并注册监听。探针结束后释放端口。

已修改用户级启动配置：

`C:/Users/Administrator/AppData/Roaming/Huawei/DevEcoStudio6.0/devecostudio64.exe.vmoptions`

保留原 `-Xmx2048m`，新增独立临时目录参数。原文件备份：`devecostudio64.exe.vmoptions.before-login-fix`。临时目录已创建，请勿删除。

该参数只影响DevEco启动的Java进程，不改变全局网络和代理。必须完全退出再启动DevEco后生效。实际华为账号登录、授权及调试签名仍需用户完成；本记录不代表已取得签名或已安装应用。
