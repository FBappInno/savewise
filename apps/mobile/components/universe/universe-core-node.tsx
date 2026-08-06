import {
  useEffect,
  useRef,
} from "react";

import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type {
  UniversePoint,
} from "@/components/universe/universe-types";

import {
  universeTheme,
} from "@/theme/universe-theme";

type Props = {
  position:
    UniversePoint;

  onPress:
    () => void;
};

export function UniverseCoreNode({
  position,
  onPress,
}: Props) {
  const pulse =
    useRef(
      new Animated.Value(0),
    ).current;

  useEffect(() => {
    const animation =
      Animated.loop(
        Animated.sequence([
          Animated.timing(
            pulse,
            {
              duration: 1800,
              toValue: 1,
              useNativeDriver:
                true,
            },
          ),

          Animated.timing(
            pulse,
            {
              duration: 1800,
              toValue: 0,
              useNativeDriver:
                true,
            },
          ),
        ]),
      );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulse]);

  const size =
    universeTheme.node
      .centerSize;

  const pulseScale =
    pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [
        1,
        1.08,
      ],
    });

  const pulseOpacity =
    pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [
        0.45,
        0.08,
      ],
    });

  return (
    <Pressable
      accessibilityLabel="SaveWise-Zentrum"
      accessibilityRole="button"
      onPress={onPress}
      style={({
        pressed,
      }) => [
        styles.container,

        {
          height: size,
          left:
            position.x -
            size / 2,
          top:
            position.y -
            size / 2,
          width: size,
        },

        pressed &&
          styles.pressed,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulse,

          {
            opacity:
              pulseOpacity,

            transform: [
              {
                scale:
                  pulseScale,
              },
            ],
          },
        ]}
      />

      <View
        style={
          styles.core
        }
      >
        <View
          style={
            styles.logo
          }
        >
          <Text
            style={
              styles.logoText
            }
          >
            S
          </Text>
        </View>

        <Text
          style={
            styles.title
          }
        >
          SAVEWISE
        </Text>
      </View>
    </Pressable>
  );
}

const styles =
  StyleSheet.create({
    container: {
      position: "absolute",
      zIndex: 5,
    },

    pulse: {
      backgroundColor:
        "rgba(56, 189, 248, 0.18)",
      borderColor:
        "rgba(103, 232, 249, 0.55)",
      borderRadius: 999,
      borderWidth: 1,
      bottom: -15,
      left: -15,
      position: "absolute",
      right: -15,
      top: -15,
    },

    core: {
      alignItems: "center",
      backgroundColor:
        "#051426",
      borderColor:
        universeTheme.colors
          .primaryBright,
      borderRadius: 999,
      borderWidth: 2,
      flex: 1,
      justifyContent:
        "center",
      shadowColor:
        universeTheme.colors
          .primary,
      shadowOffset: {
        height: 0,
        width: 0,
      },
      shadowOpacity: 0.95,
      shadowRadius: 22,
    },

    logo: {
      alignItems: "center",
      borderColor:
        universeTheme.colors
          .primary,
      borderRadius: 999,
      borderWidth: 2,
      height: 42,
      justifyContent:
        "center",
      width: 42,
    },

    logoText: {
      color:
        universeTheme.colors
          .primaryBright,
      fontSize: 25,
      fontWeight: "800",
    },

    title: {
      color:
        universeTheme.colors
          .text,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.2,
      marginTop: 6,
    },

    pressed: {
      opacity: 0.65,
    },
  });