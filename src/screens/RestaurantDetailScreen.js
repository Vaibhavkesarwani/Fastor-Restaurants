import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform, PanResponder, Alert, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Image as RNImage } from 'react-native'; // used to read local asset dimensions
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
 
const { width: SCREEN_W } = Dimensions.get('window');
const HORIZONTAL_MARGIN = 16 * 2; // left + right margin used by canvas style
const CANVAS_HEIGHT = Math.round(SCREEN_W * 0.56); // ~16:9-ish but responsive
const INITIAL_CONTAINER_W = SCREEN_W - HORIZONTAL_MARGIN;
 
// read the bundled logo's intrinsic size so we preserve its aspect ratio
const LOGO_ASSET = require('../../assets/fastor_logo.png');
const LOGO_ASSET_INFO = RNImage.resolveAssetSource(LOGO_ASSET) || { width: 1, height: 1 };
const LOGO_RATIO = LOGO_ASSET_INFO.width / LOGO_ASSET_INFO.height;
const BASE_LOGO_HEIGHT = 25; // base displayed height

// logo scale limits
const MIN_SCALE = 0.6;
const MAX_SCALE = 3;

// slider UI constants
const SLIDER_HEIGHT = 160;
const SLIDER_WIDTH = 28;
const KNOB_SIZE = 18;
const TRACK_W = 6;
 
export default function RestaurantDetailScreen({ route, navigation }) {
   const { restaurant, imageUrl } = route.params || {};
   const shotRef = useRef(null);
   const [containerSize, setContainerSize] = useState({ w: INITIAL_CONTAINER_W, h: CANVAS_HEIGHT });

   // scaleable logo size (preserves original aspect ratio)
   const [scale, setScale] = useState(1);
   const logoWidth = Math.round(BASE_LOGO_HEIGHT * scale * LOGO_RATIO);
   const logoHeight = Math.round(BASE_LOGO_HEIGHT * scale);

   const [logoPos, setLogoPos] = useState({
     x: Math.max(0, (INITIAL_CONTAINER_W - logoWidth) / 2),
     y: Math.max(0, (CANVAS_HEIGHT - logoHeight) / 2),
   });
 
   const [fallback, setFallback] = useState(false);
 
   const panStartRef = useRef({ x: 0, y: 0 }); // store initial position at gesture start
   const logoPosRef = useRef(logoPos); // keep latest pos in a ref so panResponder doesn't need to re-create
   const layoutInitializedRef = useRef(false);
   const trackRef = useRef(null);
   const trackTopWindowRef = useRef(0);
   const sliderStartYRef = useRef(0);
   const prevSizeRef = useRef({ w: Math.round(BASE_LOGO_HEIGHT * 1 * LOGO_RATIO), h: Math.round(BASE_LOGO_HEIGHT * 1) });
 
   // helper to update both state and ref
   const updateLogoPos = pos => {
     logoPosRef.current = pos;
     setLogoPos(pos);
   };
 
   // when container size or logo size changes, ensure the logo stays within bounds
   useEffect(() => {
     const maxX = Math.max(0, containerSize.w - logoWidth);
     const maxY = Math.max(0, containerSize.h - logoHeight);
     const cx = Math.max(0, Math.min(logoPosRef.current.x, maxX));
     const cy = Math.max(0, Math.min(logoPosRef.current.y, maxY));
     if (cx !== logoPosRef.current.x || cy !== logoPosRef.current.y) {
       updateLogoPos({ x: cx, y: cy });
     }
   }, [containerSize.w, containerSize.h, logoWidth, logoHeight]);

   // keep the logo center fixed while scaling
   useEffect(() => {
     const old = prevSizeRef.current;
     const newW = Math.round(BASE_LOGO_HEIGHT * scale * LOGO_RATIO);
     const newH = Math.round(BASE_LOGO_HEIGHT * scale);
     if (old.w === newW && old.h === newH) return;
     const centerX = logoPosRef.current.x + old.w / 2;
     const centerY = logoPosRef.current.y + old.h / 2;
     const maxX = Math.max(0, containerSize.w - newW);
     const maxY = Math.max(0, containerSize.h - newH);
     let nx = centerX - newW / 2;
     let ny = centerY - newH / 2;
     nx = Math.max(0, Math.min(nx, maxX));
     ny = Math.max(0, Math.min(ny, maxY));
     updateLogoPos({ x: nx, y: ny });
     prevSizeRef.current = { w: newW, h: newH };
   }, [scale, containerSize.w, containerSize.h]);
 
   // create panResponder once; it reads current position from logoPosRef and writes via updateLogoPos
   const panResponder = useMemo(() => {
     return PanResponder.create({
       onStartShouldSetPanResponder: () => true,
       onPanResponderGrant: () => {
         panStartRef.current = { x: logoPosRef.current.x, y: logoPosRef.current.y };
       },
       onPanResponderMove: (evt, gesture) => {
         const start = panStartRef.current;
         // clamp against the actual logo width/height so edges are reachable
         const maxX = Math.max(0, containerSize.w - logoWidth);
         const maxY = Math.max(0, containerSize.h - logoHeight);
         const unclampedX = start.x + gesture.dx;
         const unclampedY = start.y + gesture.dy;
         const newX = Math.max(0, Math.min(unclampedX, maxX));
         const newY = Math.max(0, Math.min(unclampedY, maxY));
         updateLogoPos({ x: newX, y: newY });
       },
       onPanResponderRelease: () => {},
     });
   }, [containerSize.w, containerSize.h, logoWidth, logoHeight]);
 
   // vertical slider to control scale (placed outside capture area)
   const sliderToScale = (y) => {
     const t = 1 - y / SLIDER_HEIGHT; // top => 1, bottom => 0
     const clamped = Math.max(0, Math.min(t, 1));
     return MIN_SCALE + clamped * (MAX_SCALE - MIN_SCALE);
   };
   const scaleToY = (s) => {
     const t = (s - MIN_SCALE) / (MAX_SCALE - MIN_SCALE);
     const clamped = Math.max(0, Math.min(t, 1));
     return (1 - clamped) * SLIDER_HEIGHT;
   };
  const sliderResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        try {
          trackRef.current?.measureInWindow?.((x, y, w, h) => {
            trackTopWindowRef.current = y || 0;
            const pageY = evt.nativeEvent?.pageY ?? 0;
            const relY = pageY - trackTopWindowRef.current;
            setScale(sliderToScale(Math.max(0, Math.min(relY, SLIDER_HEIGHT))));
          });
        } catch {
          const y = evt.nativeEvent?.locationY ?? 0;
          setScale(sliderToScale(Math.max(0, Math.min(y, SLIDER_HEIGHT))));
        }
      },
      onPanResponderMove: (evt) => {
        const pageY = evt.nativeEvent?.pageY ?? 0;
        const relY = pageY - (trackTopWindowRef.current || 0);
        setScale(sliderToScale(Math.max(0, Math.min(relY, SLIDER_HEIGHT))));
      },
    });
  }, []);
 
   const onShare = async () => {
     try {
       if (Platform.OS === 'web') {
         const uri = await captureRef(shotRef, { format: 'png', quality: 1, result: 'base64' });
         const byteCharacters = atob(uri);
         const byteNumbers = new Array(byteCharacters.length);
         for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
         const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'image/png' });
         const fileName = `${(restaurant?.restaurant_name || 'restaurant').replace(/\s+/g, '_')}.png`;
         if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: 'image/png' })] })) {
           const file = new File([blob], fileName, { type: 'image/png' });
           await navigator.share({ files: [file], title: 'Share Restaurant' });
           return;
         }
         const link = document.createElement('a');
         link.href = URL.createObjectURL(blob);
         link.download = fileName;
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
         return;
       }
 
       const uri = await captureRef(shotRef, { format: 'png', quality: 1, result: 'tmpfile' });
       const available = await Sharing.isAvailableAsync();
       if (available) {
         await Sharing.shareAsync(uri);
       } else {
         const dest = FileSystem.cacheDirectory + 'share.png';
         await FileSystem.copyAsync({ from: uri, to: dest });
         Alert.alert('Saved', 'Image saved to cache directory: ' + dest);
       }
     } catch (e) {
       Alert.alert('Share failed', 'Unable to share image.');
     }
   };
 
   // derived slider knob position from current scale
   const knobTop = scaleToY(scale) - KNOB_SIZE / 2;

   // extra restaurant details (from RestaurantsScreen)
   const name = restaurant?.restaurant_name || restaurant?.name || 'Restaurant';
   const address = restaurant?.address_complete ? String(restaurant.address_complete).replace('null','') : (restaurant?.address || restaurant?.location || '');
   const rating = restaurant?.rating || restaurant?.avg_rating || 4.5;
   const cost = restaurant?.cost_for_two ? `$ ${restaurant.cost_for_two}` : (restaurant?.cost ? restaurant.cost : '$ 200');
   const cuisines = restaurant?.cuisines || restaurant?.tags || (restaurant?.categories && Array.isArray(restaurant.categories) ? restaurant.categories.join(', ') : '');

   return (
     <View style={styles.screen}>
       <View style={styles.header}>
         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
           <Text style={styles.backText}>{'<'} Back</Text>
         </TouchableOpacity>
         <Text style={styles.headerTitle}>{name}</Text>
       </View>
 
      <View
        style={[styles.canvasWrap, { height: CANVAS_HEIGHT }]}
        onLayout={e => {
          const { width, height } = e.nativeEvent.layout;
          if (width !== containerSize.w || height !== containerSize.h) {
            setContainerSize({ w: width, h: height });
          }
          // only center the logo once on first layout
          if (!layoutInitializedRef.current) {
            layoutInitializedRef.current = true;
            const cx = Math.max(0, (width - logoWidth) / 2);
            const cy = Math.max(0, (height - logoHeight) / 2);
            updateLogoPos({ x: cx, y: cy });
          }
        }}
      >
        <View
          ref={shotRef}
          collapsable={false}
          style={styles.canvas}
        >
          <Image
            source={imageUrl && !fallback ? { uri: imageUrl } : require('../../assets/restaurant_alt.jpg')}
            style={styles.imageFill}
            contentFit="cover"
            onError={() => setFallback(true)}
          />

          <View
            {...panResponder.panHandlers}
            style={[
              styles.logoWrap,
              { width: logoWidth, height: logoHeight, transform: [{ translateX: logoPos.x }, { translateY: logoPos.y }] },
            ]}
          >
            <Image source={LOGO_ASSET} style={{ width: '100%', height: '100%' }} contentFit="contain" />
          </View>
        </View>

        {/* vertical size slider (kept outside the captured canvas but visually aligned) */}
        <View style={[styles.sliderWrap, { right: 10, top: (CANVAS_HEIGHT - SLIDER_HEIGHT) / 2, width: SLIDER_WIDTH }]}>
          <View ref={trackRef} style={[styles.sliderTrack, { height: SLIDER_HEIGHT, width: TRACK_W }]}
            onLayout={() => {
              try {
                trackRef.current?.measureInWindow?.((x, y, w, h) => {
                  trackTopWindowRef.current = y || 0;
                });
              } catch {}
            }}
            hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }}
            {...sliderResponder.panHandlers}
          >
            <View pointerEvents="none" style={[styles.sliderKnob, { top: Math.max(-KNOB_SIZE/2, Math.min(SLIDER_HEIGHT - KNOB_SIZE/2, knobTop)), left: (TRACK_W - KNOB_SIZE) / 2, width: KNOB_SIZE, height: KNOB_SIZE }]} />
          </View>
        </View>
      </View>

      {/* details panel added: mirrors RestaurantsScreen details */}
      <ScrollView style={styles.detailsWrap} contentContainerStyle={{ padding: 16, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle} numberOfLines={2}>{name}</Text>
          {cuisines ? <Text style={styles.detailsSubtitle} numberOfLines={1}>{cuisines}</Text> : null}
          {address ? <Text style={styles.detailsAddress} numberOfLines={2}>{address}</Text> : null}

          <View style={{ height: 8 }} />

          <View style={styles.offerBadge}>
            <Text style={styles.offerEmoji}>🏷️</Text>
            <Text style={styles.offerText}>4 Offers trending</Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabelSmall}>Popularity</Text>
              <Text style={styles.metaBig}>★ {rating}</Text>
            </View>

            <View style={styles.metaBoxRight}>
              <Text style={styles.metaLabelSmall}>Cost for two</Text>
              <Text style={styles.metaBig}>{cost}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
 
       <TouchableOpacity onPress={onShare} style={styles.shareBtn}>
         <Text style={styles.shareText}>Share</Text>
       </TouchableOpacity>
     </View>
   );
 }
 
 const styles = StyleSheet.create({
   screen: { flex: 1, backgroundColor: '#FFFFFF' },
   header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12 },
   backBtn: { paddingVertical: 8, paddingRight: 12, paddingLeft: 0 },
   backText: { fontSize: 16, color: '#1E232C' },
   headerTitle: { fontSize: 20, fontWeight: '700', color: '#1E232C', marginLeft: 8 },
  // canvas uses an explicit height so the image isn't stretched by different device aspect ratios
  canvasWrap: { margin: 16, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  // inner canvas fills the wrap; only this is captured
  canvas: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  // make the image absolutely fill the canvas to avoid layout rounding/stretches
  imageFill: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  logoWrap: { position: 'absolute' },

  // slider styles
  sliderWrap: { position: 'absolute', alignItems: 'center' },
  sliderTrack: { width: 6, backgroundColor: '#E9E9E9', borderRadius: 4, position: 'relative' },
   sliderKnob: { position: 'absolute', borderRadius: KNOB_SIZE / 2, backgroundColor: '#FF6D6A', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },

   shareBtn: { height: 56, backgroundColor: '#FF6D6A', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginBottom: 24 },
   shareText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

   /* new details styles */
   detailsWrap: { flex: 1 },
   detailsCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F0F2F4', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
   detailsTitle: { fontSize: 20, fontWeight: '700', color: '#0F1724' },
   detailsSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 6 },
   detailsAddress: { fontSize: 13, color: '#6B7280', marginTop: 6, lineHeight: 18 },

   offerBadge: {
     flexDirection: 'row',
     alignItems: 'center',
     backgroundColor: '#FFF7F3',
     paddingVertical: 8,
     paddingHorizontal: 10,
     borderRadius: 10,
     alignSelf: 'flex-start',
     borderWidth: 1,
     borderColor: '#FDEBD6',
     marginTop: 10,
   },
   offerEmoji: { marginRight: 8, fontSize: 14 },
   offerText: { color: '#F08A5D', fontSize: 14, fontWeight: '700' },

   metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
   metaBox: { flex: 1 },
   metaBoxRight: { width: 140, alignItems: 'flex-end' },
   metaLabelSmall: { color: '#9AA0A6', fontSize: 12 },
   metaBig: { marginTop: 4, fontWeight: '700', color: '#263238', fontSize: 16 },
 });
