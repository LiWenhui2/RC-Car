import { UIAbility } from '@kit.AbilityKit';
import { window } from '@kit.ArkUI';
import { carClient } from '../ble/CarBleClient';

export default class EntryAbility extends UIAbility {
  onWindowStageCreate(stage: window.WindowStage): void {
    try {
      const main = stage.getMainWindowSync();
      main.setPreferredOrientation(window.Orientation.AUTO_ROTATION_LANDSCAPE).catch(() => {});
      main.setWindowKeepScreenOn(true).catch(() => {});
      main.on('windowEvent', (event: window.WindowEventType) => {
        if (event === window.WindowEventType.WINDOW_INACTIVE) carClient.stop();
      });
    } catch {}
    stage.loadContent('pages/Index').catch(() => { carClient.message = '页面加载失败，请重新打开应用'; });
  }
  onForeground(): void { carClient.setActive(true); }
  onBackground(): void { carClient.setActive(false); }
  onDestroy(): void { carClient.setActive(false); }
}
