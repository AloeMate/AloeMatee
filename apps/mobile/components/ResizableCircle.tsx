import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, PanResponder, StyleSheet, Dimensions, Text } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

const INITIAL_RADIUS = SW * 0.35;
const MIN_RADIUS     = 50;
const MAX_RADIUS     = SW * 0.78;

export interface ROI {
  x: number; // normalised centre-x (0–1) relative to photo
  y: number; // normalised centre-y (0–1) relative to photo
  r: number; // normalised radius   (0–1, relative to min photo dimension)
}

export interface ContainRect {
  rendW:   number;  // rendered image width  in screen px
  rendH:   number;  // rendered image height in screen px
  offsetX: number;  // left offset of rendered image from screen left
  offsetY: number;  // top  offset of rendered image from screen top
  photoW:  number;  // actual photo pixel width  — used to normalise r correctly
  photoH:  number;  // actual photo pixel height — used to normalise r correctly
}

interface Props {
  onROIChange:  (roi: ROI) => void;
  containRect?: ContainRect; // pass this for accurate ROI mapping
  // Legacy fallback — ignored when containRect is provided
  imageAspect?: number;
}

export default function ResizableCircle({ onROIChange, containRect, imageAspect }: Props) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [radius,   setRadius]   = useState(INITIAL_RADIUS);

  const positionRef = useRef({ x: 0, y: 0 });
  const radiusRef   = useRef(INITIAL_RADIUS);

  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { radiusRef.current   = radius;   }, [radius]);

  // Map screen circle → normalised photo coordinates
  const notify = useCallback(
    (pos: { x: number; y: number }, r: number) => {

      // Initialise with sensible defaults — overwritten below
      let rendW   = SW;
      let rendH   = SH;
      let offsetX = 0;
      let offsetY = 0;
      let photoW  = SW;
      let photoH  = SH;

      if (containRect) {
        // ✅ Accurate path — caller computed the exact rendered rect + real photo dims
        rendW   = containRect.rendW;
        rendH   = containRect.rendH;
        offsetX = containRect.offsetX;
        offsetY = containRect.offsetY;
        photoW  = containRect.photoW;
        photoH  = containRect.photoH;
      } else {
        // Fallback: derive from imageAspect
        const aspect = imageAspect ?? SW / SH;
        if (aspect > SW / SH) {
          rendW = SW;   rendH = SW / aspect;
        } else {
          rendH = SH;   rendW = SH * aspect;
        }
        offsetX = (SW - rendW) / 2;
        offsetY = (SH - rendH) / 2;
        photoW  = rendW;
        photoH  = rendH;
      }

      // Circle centre in screen px (origin = top-left of screen)
      const screenCx = SW / 2 + pos.x;
      const screenCy = SH / 2 + pos.y;

      // x, y: normalised to [0,1] in photo space
      const normX = (screenCx - offsetX) / rendW;
      const normY = (screenCy - offsetY) / rendH;

      // r: backend does  radius_px = r * min(photoW, photoH)
      // So r must be:    screenRadius / rendW  *  (rendW / photoW scale cancels)
      // = screenRadius / (rendW / photoW * photoW)
      // Simpler: the screen-to-photo scale = photoW / rendW
      // so  r = screenRadius * (photoW / rendW) / min(photoW, photoH)
      //       = screenRadius / (rendW * min(photoW,photoH) / photoW)
      // Since photo aspect is preserved:  rendW/photoW == rendH/photoH == scale
      // Therefore: r = screenRadius / (scale * min(photoW, photoH))
      //              = screenRadius / min(rendW, rendH)   ← same as before BUT
      // photoW/photoH come from containRect, not screen dims.
      const screenScale = rendW / photoW;   // px per photo-px
      const normR = r / (screenScale * Math.min(photoW, photoH));

      onROIChange({
        x: Math.max(0, Math.min(1, normX)),
        y: Math.max(0, Math.min(1, normY)),
        r: Math.max(0.01, normR),
      });
    },
    [onROIChange, containRect, imageAspect]
  );

  useEffect(() => { notify(position, radius); }, [position, radius, notify]);

  // ── Move responder ────────────────────────────────────────────────────────
  const moveStart = useRef({ x: 0, y: 0 });

  const moveResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => { moveStart.current = { ...positionRef.current }; },
      onPanResponderMove:  (_, g) => {
        setPosition({ x: moveStart.current.x + g.dx, y: moveStart.current.y + g.dy });
      },
    })
  ).current;

  // ── Resize responder ──────────────────────────────────────────────────────
  const radiusStart = useRef(INITIAL_RADIUS);

  const resizeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => { radiusStart.current = radiusRef.current; },
      onPanResponderMove:  (_, g) => {
        setRadius(Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, radiusStart.current + g.dx)));
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
            width: diameter, height: diameter, borderRadius: radius,
            transform: [{ translateX: position.x }, { translateY: position.y }],
          },
        ]}
      >
        {/* Dashed border */}
        <View
          style={[StyleSheet.absoluteFillObject, { borderRadius: radius, borderWidth: 2.5, borderColor: '#4CAF50', borderStyle: 'dashed' }]}
          pointerEvents="none"
        />

        {/* Move zone */}
        <View style={styles.moveZone} {...moveResponder.panHandlers}>
          <View style={styles.crossV} />
          <View style={styles.crossH} />
        </View>

        {/* Resize handle */}
        <View style={styles.resizeHandle} {...resizeResponder.panHandlers}>
          <Text style={styles.resizeIcon}>↔️</Text>
        </View>
      </View>

      <View style={styles.helperBadge} pointerEvents="none">
        <Text style={styles.helperText}>Drag centre to move  •  Drag ↔️ to resize</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  circle:      { justifyContent: 'center', alignItems: 'center', overflow: 'visible' },
  moveZone:    { width: '75%', height: '75%', justifyContent: 'center', alignItems: 'center', borderRadius: 9999 },
  crossV:      { position: 'absolute', width: 2,  height: 26, backgroundColor: 'rgba(76,175,80,0.9)', borderRadius: 1 },
  crossH:      { position: 'absolute', width: 26, height: 2,  backgroundColor: 'rgba(76,175,80,0.9)', borderRadius: 1 },
  resizeHandle: { position: 'absolute', right: -22, width: 44, height: 44, backgroundColor: '#fff', borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.5, shadowRadius: 5 },
  resizeIcon:  { fontSize: 20 },
  helperBadge: { position: 'absolute', bottom: 140, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20 },
  helperText:  { color: '#fff', fontSize: 12 },
});