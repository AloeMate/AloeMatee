import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, PanResponder, StyleSheet, Dimensions, Text } from 'react-native';

const { width, height } = Dimensions.get('window');

const INITIAL_RADIUS = width * 0.35;
const MIN_RADIUS = 50;
const MAX_RADIUS = width * 0.78;

export interface ROI {
  x: number; // normalised centre-x (0–1)
  y: number; // normalised centre-y (0–1)
  r: number; // normalised radius   (0–1, relative to min dimension)
}

interface Props {
  onROIChange: (roi: ROI) => void;
  imageAspect?: number; // width/height of captured GEO photo — for letterbox correction
}

export default function ResizableCircle({ onROIChange, imageAspect }: Props) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [radius, setRadius] = useState(INITIAL_RADIUS);

  // Refs keep PanResponder closures up-to-date without stale captures
  const positionRef = useRef({ x: 0, y: 0 });
  const radiusRef = useRef(INITIAL_RADIUS);

  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { radiusRef.current = radius; }, [radius]);

  // Notify parent on any change
  // When GEO image is shown with resizeMode="contain", black bars appear on
  // sides or top/bottom. We map the circle's screen position back to the
  // actual photo coordinates so the Geo algorithm gets the right area.
  const notify = useCallback(
    (pos: { x: number; y: number }, r: number) => {
      const aspect = imageAspect ?? width / height;

      let renderedW: number;
      let renderedH: number;
      if (aspect > width / height) {
        // Landscape photo — fills width, bars on top/bottom
        renderedW = width;
        renderedH = width / aspect;
      } else {
        // Portrait photo — fills height, bars on sides
        renderedH = height;
        renderedW = height * aspect;
      }

      const imgLeft = (width  - renderedW) / 2;
      const imgTop  = (height - renderedH) / 2;

      const screenCx = width  / 2 + pos.x;
      const screenCy = height / 2 + pos.y;

      const normX = (screenCx - imgLeft) / renderedW;
      const normY = (screenCy - imgTop)  / renderedH;
      const minDim = Math.min(width, height);

      onROIChange({
        x: Math.max(0, Math.min(1, normX)),
        y: Math.max(0, Math.min(1, normY)),
        r: r / minDim,
      });
    },
    [onROIChange, imageAspect]
  );

  useEffect(() => {
    notify(position, radius);
  }, [position, radius, notify]);

  // ── Move responder ──────────────────────────────────────────────────────────
  const moveStart = useRef({ x: 0, y: 0 });

  const moveResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        moveStart.current = { ...positionRef.current };
      },
      onPanResponderMove: (_, g) => {
        setPosition({
          x: moveStart.current.x + g.dx,
          y: moveStart.current.y + g.dy,
        });
      },
    })
  ).current;

  // ── Resize responder ────────────────────────────────────────────────────────
  const radiusStart = useRef(INITIAL_RADIUS);

  const resizeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        radiusStart.current = radiusRef.current;
      },
      onPanResponderMove: (_, g) => {
        const next = Math.min(
          MAX_RADIUS,
          Math.max(MIN_RADIUS, radiusStart.current + g.dx)
        );
        setRadius(next);
      },
    })
  ).current;

  const diameter = radius * 2;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Circle */}
      <View
        style={[
          styles.circle,
          {
            width: diameter,
            height: diameter,
            borderRadius: radius,
            transform: [{ translateX: position.x }, { translateY: position.y }],
          },
        ]}
      >
        {/* Dashed border ring */}
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: radius,
              borderWidth: 2.5,
              borderColor: '#4CAF50',
              borderStyle: 'dashed',
            },
          ]}
          pointerEvents="none"
        />

        {/* Drag-to-move zone */}
        <View style={styles.moveZone} {...moveResponder.panHandlers}>
          <View style={styles.crossV} />
          <View style={styles.crossH} />
        </View>

        {/* Drag-to-resize handle */}
        <View style={styles.resizeHandle} {...resizeResponder.panHandlers}>
          <Text style={styles.resizeIcon}>↔️</Text>
        </View>
      </View>

      {/* Helper label */}
      <View style={styles.helperBadge} pointerEvents="none">
        <Text style={styles.helperText}>
          Drag centre to move  •  Drag ↔️ to resize
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  moveZone: {
    width: '75%',
    height: '75%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9999,
  },
  crossV: {
    position: 'absolute',
    width: 2,
    height: 26,
    backgroundColor: 'rgba(76,175,80,0.9)',
    borderRadius: 1,
  },
  crossH: {
    position: 'absolute',
    width: 26,
    height: 2,
    backgroundColor: 'rgba(76,175,80,0.9)',
    borderRadius: 1,
  },
  resizeHandle: {
    position: 'absolute',
    right: -22,
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  resizeIcon: { fontSize: 20 },
  helperBadge: {
    position: 'absolute',
    bottom: 140,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  helperText: { color: '#fff', fontSize: 12 },
});