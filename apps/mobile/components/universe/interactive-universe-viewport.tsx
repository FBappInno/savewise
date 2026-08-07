import {
  Ionicons,
} from "@expo/vector-icons";

import type {
  PropsWithChildren,
} from "react";

import {
  useEffect,
  useMemo,
} from "react";

import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import {
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {
  centerUniverse,
  clampScale,
  type UniverseCameraState,
} from "@/components/universe/universe-camera";

import {
  UniverseGestures,
} from "@/components/universe/universe-gestures";

import {
  universeTheme,
} from "@/theme/universe-theme";

type Props =
  PropsWithChildren<{
    width:
      number;

    height:
      number;

    resetKey:
      string;
  }>;

export function InteractiveUniverseViewport({
  width,
  height,
  resetKey,
  children,
}: Props) {
  const scale =
    useSharedValue(
      1,
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
   * Die Welt ist etwas größer als das
   * sichtbare Fenster. Dadurch lassen
   * sich viele Galaxien frei erkunden.
   */
  const world =
    useMemo(
      () => ({
        width:
          width,

        height:
          height,
      }),
      [
        width,
        height,
      ],
    );

  useEffect(() => {
    scale.value =
      1;

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

  function zoomBy(
    delta:
      number,
  ) {
    scale.value =
      withTiming(
        clampScale(
          scale.value +
            delta,
          0.6,
          2.8,
        ),
        {
          duration:
            180,
        },
      );
  }

  function center() {
    centerUniverse(
      camera,
      viewport,
      world,
    );
  }

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
          2.8
        }
        minimumScale={
          0.6
        }
        viewport={
          viewport
        }
        world={
          world
        }
      >
        {children}
      </UniverseGestures>

      <View style={styles.controls}>
        <Pressable
          hitSlop={8}
          onPress={() => {
            zoomBy(
              -0.2,
            );
          }}
          style={
            styles.controlButton
          }
        >
          <Ionicons
            color={
              universeTheme
                .colors
                .textSecondary
            }
            name="remove"
            size={19}
          />
        </Pressable>

        <Pressable
          hitSlop={8}
          onPress={
            center
          }
          style={
            styles.controlButton
          }
        >
          <Ionicons
            color={
              universeTheme
                .colors
                .primaryBright
            }
            name="locate-outline"
            size={18}
          />
        </Pressable>

        <Pressable
          hitSlop={8}
          onPress={() => {
            zoomBy(
              0.2,
            );
          }}
          style={
            styles.controlButton
          }
        >
          <Ionicons
            color={
              universeTheme
                .colors
                .textSecondary
            }
            name="add"
            size={19}
          />
        </Pressable>
      </View>
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

    controls: {
      alignItems:
        "center",

      alignSelf:
        "center",

      backgroundColor:
        "rgba(2, 12, 22, 0.92)",

      borderColor:
        universeTheme.colors
          .border,

      borderRadius:
        999,

      borderWidth:
        1,

      bottom:
        10,

      flexDirection:
        "row",

      padding:
        3,

      position:
        "absolute",
    },

    controlButton: {
      alignItems:
        "center",

      height:
        34,

      justifyContent:
        "center",

      width:
        38,
    },
  });
