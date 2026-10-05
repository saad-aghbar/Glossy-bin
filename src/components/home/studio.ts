import { PMREMGenerator, type Scene, type WebGLRenderer } from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export function mountStudioEnvironment(renderer: WebGLRenderer, scene: Scene) {
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const texture = pmrem.fromScene(room, 0.04).texture;
  scene.environment = texture;
  scene.environmentIntensity = 0.8;
  room.dispose();
  return () => {
    requestAnimationFrame(() => {
      if (scene.environment === texture) {
        scene.environment = null;
        scene.environmentIntensity = 1;
      }
      texture.dispose();
      pmrem.dispose();
    });
  };
}
