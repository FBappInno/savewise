import type {
  PropsWithChildren,
} from "react";

import {
  StyleSheet,
  View,
} from "react-native";

import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";

import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import type {
  UniverseCameraState,
  UniverseSize,
} from "@/components/universe/universe-camera";

type UniverseGesturesProps =
  PropsWithChildren<{
    camera: UniverseCameraState;
    viewport: UniverseSize;
    world: UniverseSize;
    minimumScale?: number;
    maximumScale?: number;
  }>;

const MINIMUM_VISIBLE_WORLD_PX =
  110;

export function UniverseGestures({
  camera,
  viewport,
  world,
  children,
  minimumScale = 0.55,
  maximumScale = 2.4,
}: UniverseGesturesProps) {
  const panStartX =
    useSharedValue(0);

  const panStartY =
    useSharedValue(0);

  const pinchStartScale =
    useSharedValue(1);

  const pinchStartX =
    useSharedValue(0);

  const pinchStartY =
    useSharedValue(0);

  const panGesture =
    Gesture.Pan()
      .maxPointers(1)
      .minDistance(4)
      .onBegin(() => {
        panStartX.value =
          camera.translateX.value;

        panStartY.value =
          camera.translateY.value;
      })
      .onUpdate((event) => {
        const requestedX =
          panStartX.value +
          event.translationX;

        const requestedY =
          panStartY.value +
          event.translationY;

        const scale =
          camera.scale.value;

        const worldCenterX =
          world.width / 2;

        const worldCenterY =
          world.height / 2;

        /*
         * Sichtbare Grenzen der skalierten Welt.
         * React Native skaliert standardmäßig um den Mittelpunkt.
         */
        const minimumX =
          MINIMUM_VISIBLE_WORLD_PX -
          worldCenterX -
          worldCenterX * scale;

        const maximumX =
          viewport.width -
          MINIMUM_VISIBLE_WORLD_PX -
          worldCenterX +
          worldCenterX * scale;

        const minimumY =
          MINIMUM_VISIBLE_WORLD_PX -
          worldCenterY -
          worldCenterY * scale;

        const maximumY =
          viewport.height -
          MINIMUM_VISIBLE_WORLD_PX -
          worldCenterY +
          worldCenterY * scale;

        camera.translateX.value =
          Math.min(
            maximumX,
            Math.max(
              minimumX,
              requestedX,
            ),
          );

        camera.translateY.value =
          Math.min(
            maximumY,
            Math.max(
              minimumY,
              requestedY,
            ),
          );
      });

  const pinchGesture =
    Gesture.Pinch()
      .onBegin(() => {
        pinchStartScale.value =
          camera.scale.value;

        pinchStartX.value =
          camera.translateX.value;

        pinchStartY.value =
          camera.translateY.value;
      })
      .onUpdate((event) => {
        const requestedScale =
          pinchStartScale.value *
          event.scale;

        const nextScale =
          Math.min(
            maximumScale,
            Math.max(
              minimumScale,
              requestedScale,
            ),
          );

        const worldCenterX =
          world.width / 2;

        const worldCenterY =
          world.height / 2;

        const minimumX =
          MINIMUM_VISIBLE_WORLD_PX -
          worldCenterX -
          worldCenterX *
            nextScale;

        const maximumX =
          viewport.width -
          MINIMUM_VISIBLE_WORLD_PX -
          worldCenterX +
          worldCenterX *
            nextScale;

        const minimumY =
          MINIMUM_VISIBLE_WORLD_PX -
          worldCenterY -
          worldCenterY *
            nextScale;

        const maximumY =
          viewport.height -
          MINIMUM_VISIBLE_WORLD_PX -
          worldCenterY +
          worldCenterY *
            nextScale;

        camera.scale.value =
          nextScale;

        /*
         * Die während des Pinch-Zooms bestehende
         * Kameraposition bleibt stabil. Dadurch entsteht
         * kein kumulierender Versatz bei wiederholtem
         * Herauszoomen.
         */
        camera.translateX.value =
          Math.min(
            maximumX,
            Math.max(
              minimumX,
              pinchStartX.value,
            ),
          );

        camera.translateY.value =
          Math.min(
            maximumY,
            Math.max(
              minimumY,
              pinchStartY.value,
            ),
          );
      });

  const combinedGesture =
    Gesture.Simultaneous(
      panGesture,
      pinchGesture,
    );

  const animatedWorldStyle =
    useAnimatedStyle(() => ({
      transform: [
        {
          translateX:
            camera.translateX.value,
        },

        {
          translateY:
            camera.translateY.value,
        },

        {
          scale:
            camera.scale.value,
        },
      ],
    }));

  return (
    <View
      style={[
        styles.viewport,

        {
          height:
            viewport.height,

          width:
            viewport.width,
        },
      ]}
    >
      <GestureDetector
        gesture={combinedGesture}
      >
        <Animated.View
          collapsable={false}
          style={[
            styles.world,

            {
              height:
                world.height,

              width:
                world.width,
            },

            animatedWorldStyle,
          ]}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles =
  StyleSheet.create({
    viewport: {
      overflow: "hidden",
      position: "relative",
    },

    world: {
      left: 0,
      position: "absolute",
      top: 0,
    },
  });