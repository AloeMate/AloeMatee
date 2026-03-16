import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, PanResponder, StyleSheet, Dimensions, Text } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

const INITIAL_RADIUS = SW * 0.40;  // increased from 0.35 so default circle covers full plant at 1m
const MIN_RADIUS     = 50;
const MAX_RADIUS     = SW * 0.78;

export interface ROI {
  x: number; // normalised centre-x  (0–1, relative to rendered image)
  y: number; // normalised centre-y  (0–1, relative to rendered image)
  r: number; // normalised radius    (0–1, relative to min(renderedW, renderedH))
}

/**
 * ContainRect describes the actual pixel rectangle a resizeMode="contain"
 * image occupies inside its container — accounting for letterbox/pillarbox bars.
 *
 * Computed by getContainRect() in CameraScreen.tsx and passed as a prop.
 *
 * Examples on a 390×844 portrait screen:
 *   Portrait photo  (3024×4032): rendW=390, rendH=520, offsetX=0,   offsetY=162
 *   Landscape photo (4032×3024): rendW=390, rendH=292, offsetX=0,   offsetY=276
 *   Square photo    (3024×3024): rendW=390, rendH=390, offsetX=0,   offsetY=227
 */
export interface ContainRect {
  rendW:   number;
  rendH:   number;
  offsetX: number;
  offsetY: number;
  photoW:  number;
  photoH:  number;
}

interface Props {
  onROIChange:  (roi: ROI) => void;
  containRect?: ContainRect;
}

export default function ResizableCircle({ onROIChange, containRect }: Props) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [radius,   setRadius]   = useState(INITIAL_RADIUS);
  const [debugRoi, setDebugRoi] = useState({ r: 0, area: 0 });

  const positionRef = useRef({ x: 0, y: 0 });
  const radiusRef   = useRef(INITIAL_RADIUS);

  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { radiusRef.current   = radius;   }, [radius]);

  /**
   * Convert screen-pixel circle position and radius into normalised ROI.
   *
   * KEY FORMULA:
   *   normX  = (screenCx - offsetX) / rendW
   *   normY  = (screenCy - offsetY) / rendH
   *   roi_r  = screenRadius / min(rendW, rendH)
   *
   * The backend computes:
   *   radius_px = roi_r * min(img_w, img_h)
   *
   * So roi_r = screenRadius / min(rendW, rendH) ensures that when the backend
   * multiplies roi_r back by min(img_w, img_h), it recovers the correct
   * physical radius in the original photo's pixel space.
   *
   * Using min(SW, SH) instead (old bug) gave a wrong roi_r for any gallery
   * image whose rendered size differs from screen size — which is almost all
   * gallery images, especially landscape photos on portrait screens.
   */
  const notify = useCallback(
    (pos: { x: number; y: number }, r: number) => {
      let renderedW: number;
      let renderedH: number;
      let imgLeft:   number;
      let imgTop:    number;

      if (containRect) {
        renderedW = containRect.rendW;
        renderedH = containRect.rendH;
        imgLeft   = containRect.offsetX;
        imgTop    = containRect.offsetY;
      } else {
        // Fallback: live camera fills the full screen
        renderedW = SW;
        renderedH = SH;
        imgLeft   = 0;
        imgTop    = 0;
      }

      const screenCx = SW / 2 + pos.x;
      const screenCy = SH / 2 + pos.y;

      const normX  = (screenCx - imgLeft) / renderedW;
      const normY  = (screenCy - imgTop)  / renderedH;
      const minDim = Math.min(renderedW, renderedH); // ✅ image dims, not screen dims

      const roiR = r / minDim;
      onROIChange({
        x: Math.max(0, Math.min(1, normX)),
        y: Math.max(0, Math.min(1, normY)),
        r: roiR,
      });
      // Debug: show live roi_r and estimated area on screen
      setDebugRoi({ r: roiR, area: Math.PI * roiR * roiR });
    },
    [onROIChange, containRect]
  );

  useEffect(() => {
    notify(position, radius);
  }, [position, radius, notify]);

  // ── Move responder ──────────────────────────────────────────────────────────
  const moveStart = useRef({ x: 0, y: 0 });

  const moveResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
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
      onMoveShouldSetPanResponder:  () => true,
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
      <View
        style={[
          styles.circle,
          {
            width:        diameter,
            height:       diameter,
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
              borderWidth:  2.5,
              borderColor:  '#4CAF50',
              borderStyle:  'dashed',
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

      {/* DEBUG badge — remove before release */}
      <View style={styles.debugBadge} pointerEvents="none">
        <Text style={styles.debugText}>
          roi_r: {debugRoi.r.toFixed(4)}  |  rendW: {containRect ? containRect.rendW.toFixed(0) : 'null'}  |  rendH: {containRect ? containRect.rendH.toFixed(0) : 'null'}
        </Text>
        <Text style={styles.debugText}>
          minDim: {containRect ? Math.min(containRect.rendW, containRect.rendH).toFixed(0) : SW + ' (screen)'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems:     'center',
  },
  circle: {
    justifyContent: 'center',
    alignItems:     'center',
    overflow:       'visible',
  },
  moveZone: {
    width:          '75%',
    height:         '75%',
    justifyContent: 'center',
    alignItems:     'center',
    borderRadius:   9999,
  },
  crossV: {
    position:        'absolute',
    width:           2,
    height:          26,
    backgroundColor: 'rgba(76,175,80,0.9)',
    borderRadius:    1,
  },
  crossH: {
    position:        'absolute',
    width:           26,
    height:          2,
    backgroundColor: 'rgba(76,175,80,0.9)',
    borderRadius:    1,
  },
  resizeHandle: {
    position:        'absolute',
    right:           -22,
    width:           44,
    height:          44,
    backgroundColor: '#fff',
    borderRadius:    22,
    justifyContent:  'center',
    alignItems:      'center',
    elevation:       8,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.5,
    shadowRadius:    5,
  },
  resizeIcon: { fontSize: 20 },
  helperBadge: {
    position:          'absolute',
    bottom:            140,
    backgroundColor:   'rgba(0,0,0,0.6)',
    paddingVertical:   7,
    paddingHorizontal: 16,
    borderRadius:      20,
  },
  helperText: { color: '#fff', fontSize: 12 },
  debugBadge: {
    position:          'absolute',
    top:               80,
    left:              10,
    right:             10,
    backgroundColor:   'rgba(0,0,0,0.85)',
    borderRadius:      8,
    paddingVertical:   6,
    paddingHorizontal: 10,
    borderWidth:       1,
    borderColor:       '#FF5722',
  },
  debugText: { color: '#FF5722', fontSize: 11, fontFamily: 'monospace', textAlign: 'center' },
});