import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchRestaurants } from '../api/client';

const { width } = Dimensions.get('window');

function RemoteOrLocalImage({ uri, headers, style }) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return (
      <Image
        source={require('../../assets/restaurant_alt.jpg')}
        style={style}
        contentFit="cover"
      />
    );
  }
  return (
    <Image
      source={{ uri, headers }}
      style={style}
      contentFit="cover"
      onError={() => setFailed(true)}
    />
  );
}

export default function RestaurantsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [authToken, setAuthToken] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) setAuthToken(token);
        const response = await fetchRestaurants(118, token || undefined);
        const res = await response.json();
        let arr = res?.data?.data?.results || res?.data?.results || res?.results || [];
        if (typeof arr === 'string') { try { arr = JSON.parse(arr); } catch {} }
        if (!Array.isArray(arr)) arr = [];
        setData(arr);
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const IMAGE_WIDTH = 150; // increased image width for stronger left visual

  const renderItem = ({ item }) => {
    const imageUrl = item?.cover_image || item?.images?.[0]?.url || item?.logo;
    const name = item?.restaurant_name || item?.name || 'Restaurant';
    const address = item?.address_complete ? String(item.address_complete).replace('null','') : (item?.address || '');
    const rating = item?.rating || item?.avg_rating || 4.5;
    const cost = item?.cost_for_two ? `$ ${item.cost_for_two}` : (item?.cost ? item.cost : '$ 200');
    const cuisines = Array.isArray(item?.cuisines) ? item.cuisines.join(', ') : (item?.cuisine || (Array.isArray(item?.categories) ? item.categories.join(', ') : (Array.isArray(item?.tags) ? item.tags.join(', ') : '')));

    return (
      <TouchableOpacity
        style={[styles.card, { height: 160 }]}
        onPress={() => navigation.navigate('RestaurantDetail', { restaurant: item, imageUrl })}
        activeOpacity={0.85}
      >
        <RemoteOrLocalImage
          uri={imageUrl}
          headers={authToken ? { Authorization: `Bearer ${authToken}` } : undefined}
          style={[styles.cardImage, { width: IMAGE_WIDTH }]}
        />

        <View style={styles.cardBody}>
          {/* Title occupies full width; no top-right pill */}
          <Text style={styles.cardTitle} numberOfLines={2} ellipsizeMode="tail">{name}</Text>

          {/* Cuisines (muted) */}
          {!!cuisines && (
            <Text style={styles.cuisineText} numberOfLines={1} ellipsizeMode="tail">{cuisines}</Text>
          )}

          {/* Address above offers */}
          {address ? (
            <Text style={styles.cardSubtitle} numberOfLines={2} ellipsizeMode="tail">
              {address}
            </Text>
          ) : null}

          {/* Offers row (no bg/border, orange text) */}
          <View style={styles.offerRow}>
            <View style={styles.offerBadge}>
              <Text style={styles.offerEmoji}>🏷️</Text>
              <Text style={styles.offerText} numberOfLines={1} ellipsizeMode="tail">4 Offers trending</Text>
            </View>
          </View>

          {/* Bottom metrics: left rating (value over label), right cost */}
          <View style={styles.cardFooter}>
            <View style={styles.metaLeft}>
              <Text style={styles.metaValue}>★ {Number(rating).toFixed(1)}</Text>
              <Text style={styles.metaLabel}>Popularity</Text>
            </View>
            <View style={styles.rightMeta}>
              <Text style={styles.cost}>{cost}</Text>
              <Text style={styles.metaLabel}>Cost for two</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" /></View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Discover</Text>
      {data.length === 0 ? (
        <View style={styles.center}><Text>No restaurants found.</Text></View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, idx) => String(item?.restaurant_id || item?.id || idx)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { fontSize: 28, fontWeight: '800', color: '#1E232C', paddingTop: 38, paddingHorizontal: 16 },

  /* card with image filling left side and fixed height so details never overflow */
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#FFFFFF',
    marginTop: 14,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F2F4',
    paddingRight: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  // image now occupies left side fully (height matches card). use parent overflow to round corners.
  cardImage: {
    height: '100%',           // fill card height
    backgroundColor: '#E6E9EE',
  },

  cardBody: {
    flex: 1,
    paddingTop: 14,
    paddingBottom: 16,
    paddingLeft: 16,
    paddingRight: 0, // bring right-side items closer to the card edge
    justifyContent: 'flex-start',
    position: 'relative',     // for absolutely positioned footer
  },

  // removed topBlock + tag pill; title flows full width
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#0F1724', lineHeight: 20 },

  cuisineText: { fontSize: 14, color: '#9AA0A6', marginTop: 6 },

  cardSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 8, lineHeight: 18 },

  offerRow: { marginTop: 8 },
  offerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent', // remove orange background
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 10,
    alignSelf: 'flex-start',
    borderWidth: 0, // remove border
    maxWidth: '75%',
  },
  offerEmoji: { marginRight: 6, fontSize: 13 },
  offerText: { color: '#F08A5D', fontSize: 13, fontWeight: '700' },

  /* footer anchored to bottom inside cardBody to prevent overflow */
  cardFooter: {
    position: 'absolute',
    left: 16,
    right: 0, // push cost to the edge
    bottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between', // left and right blocks
    alignItems: 'flex-end',
  },
  metaLeft: { alignItems: 'flex-start' },
  metaLabel: { color: '#9AA0A6', fontSize: 12, marginTop: 2 },
  metaValue: { color: '#263238', fontWeight: '700' },

  rightMeta: { alignItems: 'flex-end', width: 120 },
  cost: { fontWeight: '800', color: '#263238', fontSize: 15 },
});
