import {
  useMemo,
} from "react";

import {
  StyleSheet,
  View,
} from "react-native";

import {
  universeTheme,
} from "@/theme/universe-theme";

type UniverseBackgroundProps = {
  starCount?: number;
};

export function UniverseBackground({
  starCount = 90,
}: UniverseBackgroundProps) {
  const stars =
    useMemo(
      () =>
        Array.from(
          {
            length:
              starCount,
          },

          (
            _,
            index,
          ) => ({
            id: index,

            left:
              (
                (
                  index *
                  47
                ) %
                100
              ) +
              (
                index %
                3
              ) *
                0.23,

            top:
              (
                (
                  index *
                  73
                ) %
                100
              ) +
              (
                index %
                4
              ) *
                0.17,

            size:
              index %
                9 ===
              0
                ? 2.5
                : index %
                      4 ===
                    0
                  ? 1.6
                  : 1,

            opacity:
              index %
                7 ===
              0
                ? 0.9
                : index %
                      3 ===
                    0
                  ? 0.55
                  : 0.3,
          }),
        ),
      [
        starCount,
      ],
    );

  return (
    <View
      pointerEvents="none"
      style={
        StyleSheet.absoluteFill
      }
    >
      <View
        style={
          styles.nebula
        }
      />

      {stars.map(
        (star) => (
          <View
            key={star.id}
            style={[
              styles.star,

              {
                height:
                  star.size,

                left:
                  `${star.left}%`,

                opacity:
                  star.opacity,

                top:
                  `${star.top}%`,

                width:
                  star.size,
              },
            ]}
          />
        ),
      )}
    </View>
  );
}

const styles =
  StyleSheet.create({
    nebula: {
      backgroundColor:
        "rgba(0, 112, 192, 0.08)",

      borderRadius:
        320,

      height:
        640,

      left:
        "12%",

      position:
        "absolute",

      top:
        "8%",

      width:
        640,
    },

    star: {
      backgroundColor:
        universeTheme.colors
          .primaryBright,

      borderRadius:
        999,

      position:
        "absolute",
    },
  });