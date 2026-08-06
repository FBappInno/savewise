import type {
  SharedValue,
} from "react-native-reanimated";

import {
  cancelAnimation,
  withTiming,
} from "react-native-reanimated";

export type UniversePoint = {
  x: number;
  y: number;
};

export type UniverseSize = {
  width: number;
  height: number;
};

export type UniverseCameraState = {
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
};

type FocusOptions = {
  animated?: boolean;
  durationMs?: number;
};

const DEFAULT_DURATION_MS = 420;

export function clampScale(
  value: number,
  minimum = 0.45,
  maximum = 2.4,
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}

export function getCenteredTranslation(
  viewport: UniverseSize,
  world: UniverseSize,
  scale: number,
): UniversePoint {
  return {
    x:
      viewport.width / 2 -
      world.width / 2,

    y:
      viewport.height / 2 -
      world.height / 2,
  };
}

export function getPointFocusedTranslation(
  point: UniversePoint,
  viewport: UniverseSize,
  world: UniverseSize,
  scale: number,
): UniversePoint {
  const worldCenterX =
    world.width / 2;

  const worldCenterY =
    world.height / 2;

  /*
   * React Native skaliert Views standardmäßig um ihren
   * Mittelpunkt. Daher muss die Entfernung des Knotens vom
   * Weltmittelpunkt mit dem aktuellen Zoom berücksichtigt werden.
   */
  return {
    x:
      viewport.width / 2 -
      worldCenterX -
      scale *
        (point.x -
          worldCenterX),

    y:
      viewport.height / 2 -
      worldCenterY -
      scale *
        (point.y -
          worldCenterY),
  };
}

export function setCameraPosition(
  camera: UniverseCameraState,
  position: UniversePoint,
  {
    animated = true,
    durationMs =
      DEFAULT_DURATION_MS,
  }: FocusOptions = {},
): void {
  cancelAnimation(
    camera.translateX,
  );

  cancelAnimation(
    camera.translateY,
  );

  if (!animated) {
    camera.translateX.value =
      position.x;

    camera.translateY.value =
      position.y;

    return;
  }

  camera.translateX.value =
    withTiming(
      position.x,
      {
        duration: durationMs,
      },
    );

  camera.translateY.value =
    withTiming(
      position.y,
      {
        duration: durationMs,
      },
    );
}

export function centerUniverse(
  camera: UniverseCameraState,
  viewport: UniverseSize,
  world: UniverseSize,
  options?: FocusOptions,
): void {
  setCameraPosition(
    camera,
    getCenteredTranslation(
      viewport,
      world,
      camera.scale.value,
    ),
    options,
  );
}

export function focusUniversePoint(
  camera: UniverseCameraState,
  point: UniversePoint,
  viewport: UniverseSize,
  world: UniverseSize,
  options?: FocusOptions,
): void {
  setCameraPosition(
    camera,
    getPointFocusedTranslation(
      point,
      viewport,
      world,
      camera.scale.value,
    ),
    options,
  );
}