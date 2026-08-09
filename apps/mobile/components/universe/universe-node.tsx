import { Ionicons } from "@expo/vector-icons";

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type {
  UniverseHierarchyLevel,
  UniverseNodePlacement,
} from "@/components/universe/universe-types";

import {
  universeTheme,
  type UniverseColor,
} from "@/theme/universe-theme";

type Props = {
  placement:
    UniverseNodePlacement;

  selected:
    boolean;

  expanded:
    boolean;

  onPress:
    () => void;
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

const DOMAIN_ICONS: Array<
  keyof typeof Ionicons.glyphMap
> = [
  "sparkles-outline",
  "hardware-chip-outline",
  "radio-outline",
  "shield-checkmark-outline",
  "rocket-outline",
  "business-outline",
  "code-slash-outline",
  "trending-up-outline",
];

export function UniverseNode({
  placement,
  selected,
  expanded,
  onPress,
}: Props) {
  const color =
    getDomainColor(
      placement.domainIndex,
    );

  const active =
    selected ||
    expanded;

  const size =
    getNodeSize(
      placement.level,
      placement.node
        .discoveryIds.length,
      active,
    );

  return (
    <Pressable
      accessibilityLabel={
        `${getLevelLabel(
          placement.level,
        )}: ${
          placement.node.title
        }`
      }
      accessibilityRole="button"
      onPress={onPress}
      style={({
        pressed,
      }) => [
        styles.container,

        {
          height:
            size + 78,

          left:
            placement.position.x -
            (size + 78) / 2,

          opacity:
            placement
              .isBackgroundNode
              ? 0.38
              : 1,

          top:
            placement.position.y -
            (size + 78) / 2,

          width:
            size + 78,
        },

        pressed &&
          styles.pressed,
      ]}
    >
      <View
        style={[
          styles.node,

          {
            backgroundColor:
              `${color}1D`,

            borderColor:
              color,

            borderRadius:
              size / 2,

            height:
              size,

            shadowColor:
              color,

            width:
              size,
          },

          active &&
            styles.activeNode,
        ]}
      >
        <Ionicons
          color={color}
          name={getNodeIcon(
            placement,
          )}
          size={getIconSize(
            placement.level,
            active,
          )}
        />
      </View>

      <Text
        numberOfLines={2}
        style={[
          styles.label,

          placement.level ===
            "domain" &&
            styles.domainLabel,

          placement.level ===
            "topic" &&
            styles.topicLabel,

          placement.level ===
            "subtopic" &&
            styles.subtopicLabel,

          active &&
            styles.activeLabel,
        ]}
      >
        {placement.node.title}
      </Text>

      {active ? (
        <View
          style={[
            styles.badge,

            {
              borderColor:
                `${color}88`,
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,

              {
                color,
              },
            ]}
          >
            {getLevelLabel(
              placement.level,
            )}
            {" · "}
            {
              placement.node
                .discoveryIds
                .length
            }
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function getNodeIcon(
  placement:
    UniverseNodePlacement,
): keyof typeof Ionicons.glyphMap {
  if (
    placement.level ===
    "domain"
  ) {
    return DOMAIN_ICONS[
      Math.max(
        0,
        placement.domainIndex,
      ) %
        DOMAIN_ICONS.length
    ];
  }

  if (
    placement.level ===
    "topic"
  ) {
    return "sunny-outline";
  }

  return "star-outline";
}

function getNodeSize(
  level:
    UniverseHierarchyLevel,
  discoveryCount: number,
  active: boolean,
): number {
  const growth =
    Math.min(
      18,
      Math.floor(
        Math.sqrt(
          Math.max(
            discoveryCount,
            0,
          ),
        ) * 3,
      ),
    );

  if (
    level === "domain"
  ) {
    return (
      (active ? 91 : 69) +
      growth
    );
  }

  if (
    level === "topic"
  ) {
    return (
      (active ? 65 : 49) +
      Math.min(
        growth,
        12,
      )
    );
  }

  return (
    (active ? 42 : 30) +
    Math.min(
      growth,
      8,
    )
  );
}

function getIconSize(
  level:
    UniverseHierarchyLevel,
  active: boolean,
): number {
  if (
    level === "domain"
  ) {
    return active
      ? 34
      : 27;
  }

  if (
    level === "topic"
  ) {
    return active
      ? 27
      : 22;
  }

  return active
    ? 18
    : 15;
}

function getLevelLabel(
  level:
    UniverseHierarchyLevel,
): string {
  if (
    level === "domain"
  ) {
    return "Galaxie";
  }

  if (
    level === "topic"
  ) {
    return "Planet";
  }

  return "Stern";
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
    container: {
      alignItems: "center",
      justifyContent:
        "center",
      position: "absolute",
      zIndex: 4,
    },

    node: {
      alignItems: "center",
      borderWidth: 1.5,
      justifyContent:
        "center",
      shadowOffset: {
        height: 0,
        width: 0,
      },
      shadowOpacity: 0.78,
      shadowRadius: 13,
    },

    activeNode: {
      borderWidth: 2.3,
      shadowOpacity: 1,
      shadowRadius: 24,
    },

    label: {
      color:
        universeTheme.colors
          .textSecondary,
      fontWeight: "700",
      marginTop: 7,
      maxWidth: 125,
      textAlign: "center",
    },

    domainLabel: {
      color:
        universeTheme.colors
          .text,
      fontSize: 12,
      lineHeight: 15,
    },

    topicLabel: {
      color:
        universeTheme.colors
          .text,
      fontSize: 11,
      lineHeight: 14,
    },

    subtopicLabel: {
      fontSize: 9,
      lineHeight: 11,
      maxWidth: 108,
    },

    activeLabel: {
      color:
        universeTheme.colors
          .text,
      fontSize: 14,
      fontWeight: "900",
      lineHeight: 17,
    },

    badge: {
      backgroundColor:
        "rgba(4, 12, 24, 0.92)",
      borderRadius: 999,
      borderWidth: 1,
      marginTop: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },

    badgeText: {
      fontSize: 8,
      fontWeight: "800",
    },

    pressed: {
      opacity: 0.64,
    },
  });