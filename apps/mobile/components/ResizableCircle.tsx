import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, PanResponder, StyleSheet, Dimensions, Text } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

const INITIAL_RADIUS = SW * 0.35;
const MIN_RADIUS     = 50;
const MAX_RADIUS     = SW * 0.78;

export interface ROI {
  x: number; // normalised centre-x  (0–1, relative to rendered image)
  y: number; // normalised centre-y  (0–1, relative to rendered image)
  r: number; // normalised radius    (0–1, relative to min(renderedW, renderedH))
}

/**
 * ContainRect describes the rectangle that a "resizeMode=contain" image
 * actually occupies inside its container.
 *
 * For a portrait gallery photo (3024×4032) on a 390×844 screen:
 *   rendW=390, rendH=520, offsetX=0, offsetY=162, photoW=3024, photoH=4032
 *
 * For a landscape gallery photo (4032×3024) on the same screen:
 *   rendW=390, rendH=292, offsetX=0, offsetY=276, photoW=4032, photoH=3024
 *
 * CameraScreen.getContainRect() computes this correctly.
 * Without it, roi_r is normalised against screen dimensions (390×844) instead
 * of the true rendered size — making it up to 3.5× too small for landscape
 * gallery photos, which collapses the computed area far below T1 and causes
 * every prediction to return IMMATURE.
 */
export interface ContainRect {
  rendW:   number; // actual rendered width  of the image on screen (px)
  rendH:   number; // actual rendered height of the image on screen (px)
  offsetX: number; // x of the image's top-left corner inside the container (px)
  offsetY: number; // y of the image's top-left corner inside the container (px)
  photoW:  number; // original photo pixel width  (used for screenScale)
  photoH:  number; // original photo pixel height (used for screenScale)
}

interface Props {
  onROIChange:  (roi: ROI) => void;
  /**
   * ✅ FIXED: accept containRect instead of imageAspect.
   *
   * OLD interface had:
   *   imageAspect?: number
   *
   * CameraScreen was already passing containRect={geoContainRect} but this
   * prop didn't exist — it was silently dropped. The component then fell back
   * to computing its own letterbox rect from imageAspect (which was always
   * undefined), ending up using raw screen dimensions for normalisation.
   */
  containRect?: ContainRect;
}

export default function ResizableCircle({ onROIChange, containRect }: Props) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [radius,   setRadius]   = useState(INITIAL_RADIUS);

  const positionRef = useRef({ x: 0, y: 0 });
  const radiusRef   = useRef(INITIAL_RADIUS);

  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { radiusRef.current   = radius;   }, [radius]);

  /**
   * Convert the circle's current screen-pixel position and radius into
   * normalised ROI coordinates relative to the actual photo.
   *
   * ✅ FIXED: uses containRect.rendW/H for the letterbox rect and
   *           Math.min(renderedW, renderedH) for minDim.
   *
   * OLD code:
   *   const aspect    = imageAspect ?? width / height   // always undefined → screen aspect
   *   if (aspect > width/height) { renderedW=width; renderedH=width/aspect }
   *   else                       { renderedH=height; renderedW=height*aspect }
   *   const minDim = Math.min(width, height)            // ← screen dims, not image dims
   *
   * For a landscape gallery photo (4032×3024) on a 390×844 screen the old
   * code computed minDim=390 (screen short side) when the correct value is
   * min(390, 292)=292 (rendered image short side). This made roi_r 1.34×
   * too large in this direction. Combined with the wrong renderedH, the
   * overall area error reached up to ~12× for extreme aspect ratios,
   * always pushing the result below T1 → always IMMATURE.
   *
   * NEW code reads rendW/H/offsetX/offsetY directly from containRect and
   * uses Math.min(renderedW, renderedH) for minDim — exactly matching what
   * the backend's geo_area_px2() expects.
   */
  const notify = useCallback(
    (pos: { x: number; y: number }, r: number) => {
      let renderedW: number;
      let renderedH: number;
      let imgLeft:   number;
      let imgTop:    number;

      if (containRect) {
        // ✅ Use the pre-computed aspect-ratio-correct rect from CameraScreen
        renderedW = containRect.rendW;
        renderedH = containRect.rendH;
        imgLeft   = containRect.offsetX;
        imgTop    = containRect.offsetY;
      } else {
        // Fallback for live camera (no containRect needed — fills full screen)
        renderedW = SW;
        renderedH = SH;
        imgLeft   = 0;
        imgTop    = 0;
      }

      const screenCx = SW / 2 + pos.x;
      const screenCy = SH / 2 + pos.y;

      const normX = (screenCx - imgLeft) / renderedW;
      const normY = (screenCy - imgTop)  / renderedH;

      // ✅ FIXED: normalise radius against rendered image short side,
      //           NOT against screen short side.
      // Backend geo_area_px2() does: radius_px = roi_r * min(img_w, img_h)
      // So roi_r must be: screenRadius / (screenScale * min(photoW, photoH))
      // where screenScale = renderedW / photoW  (assumes contain fills width or height)
      // Simplified: roi_r = screenRadius / min(renderedW, renderedH)
      const minDim = Math.min(renderedW, renderedH);

      onROIChange({
        x: Math.max(0, Math.min(1, normX)),
        y: Math.max(0, Math.min(1, normY)),
        r: r / minDim,
      });
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
            width:       diameter,
            height:      diameter,
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
              borderRadius:  radius,
              borderWidth:   2.5,
              borderColor:   '#4CAF50',
              borderStyle:   'dashed',
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
    alignItems:     'center',
  },
  circle: {
    justifyContent: 'center',
    alignItems:     'center',
    overflow:       'visible',
  },
  moveZone: {
    width:         '75%',
    height:        '75%',
    justifyContent: 'center',
    alignItems:    'center',
    borderRadius:  9999,
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
    position:        'absolute',
    bottom:          140,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius:    20,
  },
  helperText: { color: '#fff', fontSize: 12 },
});