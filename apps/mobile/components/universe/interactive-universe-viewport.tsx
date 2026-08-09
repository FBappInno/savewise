import type {
  PropsWithChildren,
} from "react";

import {
  useEffect,
  useMemo,
} from "react";

import {
  StyleSheet,
  View,
} from "react-native";

import {
  useSharedValue,
} from "react-native-reanimated";

import {
  centerUniverse,
  focusUniversePoint,
  type UniverseCameraState,
  type UniversePoint,
} from "@/components/universe/universe-camera";

import {
  UniverseGestures,
} from "@/components/universe/universe-gestures";

type Props =
  PropsWithChildren<{
    width: number;
    height: number;
    resetKey: string;
    focusPoint?: UniversePoint | null;
  }>;

export function InteractiveUniverseViewport({
  width,
  height,
  resetKey,
  focusPoint = null,
  children,
}: Props) {
  const scale =
    useSharedValue(
      0.78,
    );

  const translateX =
    useSharedValue(
      0,
    );

  const translateY =
    useSharedValue(
      0,
    );

  const camera =
    useMemo<
      UniverseCameraState
    >(
      () => ({
        scale,
        translateX,
        translateY,
      }),
      [
        scale,
        translateX,
        translateY,
      ],
    );

  const viewport =
    useMemo(
      () => ({
        width,
        height,
      }),
      [
        width,
        height,
      ],
    );

  /*
   * Die mobile Welt ist deutlich größer
   * als der sichtbare iPhone-Ausschnitt.
   *
   * Dadurch kann das Universum wie eine
   * echte Karte verschoben und erkundet
   * werden.
   */
  const world =
    useMemo(
      () => ({
        width:
          Math.max(
            width * 2.6,
            900,
          ),

        height:
          Math.max(
            height * 2.3,
            1050,
          ),
      }),
      [
        width,
        height,
      ],
    );

  useEffect(() => {
    scale.value =
      0.78;

    centerUniverse(
      camera,
      viewport,
      world,
      {
        animated:
          false,
      },
    );
  }, [
    camera,
    resetKey,
    scale,
    viewport,
    world,
  ]);

  useEffect(() => {
    if (!focusPoint) {
      return;
    }

    focusUniversePoint(
      camera,
      focusPoint,
      viewport,
      world,
      {
        animated:
          true,

        durationMs:
          460,
      },
    );
  }, [
    camera,
    focusPoint,
    viewport,
    world,
  ]);

  return (
    <View
      style={[
        styles.wrapper,
        {
          height,
          width,
        },
      ]}
    >
      <UniverseGestures
        camera={
          camera
        }
        maximumScale={
          3.2
        }
        minimumScale={
          0.42
        }
        viewport={
          viewport
        }
        world={
          world
        }
      >
        <View
          style={{
            height:
              world.height,

            width:
              world.width,
          }}
        >
          {children}
        </View>
      </UniverseGestures>
    </View>
  );
}

const styles =
  StyleSheet.create({
    wrapper: {
      overflow:
        "hidden",

      position:
        "relative",
    },
  });
