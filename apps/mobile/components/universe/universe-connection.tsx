import {
  StyleSheet,
  View,
} from "react-native";

import type {
  UniverseConnectionPlacement,
} from "@/components/universe/universe-types";

import {
  universeTheme,
  type UniverseColor,
} from "@/theme/universe-theme";

type Props = {
  connection:
    UniverseConnectionPlacement;
};

const DOMAIN_COLORS:
  UniverseColor[] = [
  "cyan",
  "violet",
  "blue",
  "green",
  "purple",
  "orange",
  "yellow",
  "pink",
];

export function UniverseConnection({
  connection,
}: Props) {
  const deltaX =
    connection.to.x -
    connection.from.x;

  const deltaY =
    connection.to.y -
    connection.from.y;

  const length =
    Math.sqrt(
      deltaX * deltaX +
        deltaY * deltaY,
    );

  const angle =
    Math.atan2(
      deltaY,
      deltaX,
    ) *
    (180 / Math.PI);

  const color =
    getDomainColor(
      connection.domainIndex,
    );

  const opacity =
    connection.level ===
      "domain"
      ? "8A"
      : connection.level ===
          "topic"
        ? "70"
        : "55";

  return (
    <View
      pointerEvents="none"
      style={[
        styles.connection,

        {
          backgroundColor:
            `${color}${opacity}`,

          height:
            connection.level ===
            "domain"
              ? 1.5
              : 1,

          left:
            connection.from.x,

          top:
            connection.from.y,

          transform: [
            {
              rotateZ:
                `${angle}deg`,
            },
          ],

          width:
            length,
        },
      ]}
    />
  );
}

function getDomainColor(
  index: number,
): string {
  const colorName =
    DOMAIN_COLORS[
      Math.max(0, index) %
        DOMAIN_COLORS.length
    ];

  return universeTheme.colors[
    colorName
  ];
}

const styles =
  StyleSheet.create({
    connection: {
      opacity: 0.9,
      position: "absolute",
      transformOrigin:
        "left center",
      zIndex: 1,
    },
  });