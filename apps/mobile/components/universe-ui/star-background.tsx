import { useMemo } from "react";

import {
  StyleSheet,
  View,
} from "react-native";

import { universeTheme } from "@/theme/universe-theme";

type StarBackgroundProps = {
  density?: number;
};

export function StarBackground({
  density = 70,
}: StarBackgroundProps) {
  const stars = useMemo(
    () =>
      Array.from(
        { length: density },
        (_, index) => ({
          id: index,

          left:
            ((index * 47) % 100) +
            (index % 5) * 0.13,

          top:
            ((index * 71) % 100) +
            (index % 4) * 0.17,

          size:
            index % 13 === 0
              ? 2.4
              : index % 5 === 0
                ? 1.7
                : 1,

          opacity:
            index % 11 === 0
              ? 0.95
              : index % 4 === 0
                ? 0.55
                : 0.25,
        }),
      ),
    [density],
  );

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      <View style={styles.nebulaOne} />
      <View style={styles.nebulaTwo} />

      {stars.map((star) => (
        <View
          key={star.id}
          style={[
            styles.star,
            {
              height: star.size,
              left: `${star.left}%`,
              opacity: star.opacity,
              top: `${star.top}%`,
              width: star.size,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  star: {
    backgroundColor:
      universeTheme.colors.primaryBright,

    borderRadius: 999,

    position: "absolute",
  },

  nebulaOne: {
    backgroundColor:
      "rgba(14, 116, 144, 0.08)",

    borderRadius: 260,

    height: 520,

    left: -150,

    position: "absolute",

    top: 80,

    width: 520,
  },

  nebulaTwo: {
    backgroundColor:
      "rgba(124, 58, 237, 0.06)",

    borderRadius: 240,

    height: 480,

    position: "absolute",

    right: -210,

    top: 320,

    width: 480,
  },
});