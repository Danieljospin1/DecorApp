import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  Image,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  Share,
} from 'react-native';
import { MotiView } from 'moti';
import { Ionicons,MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const dummyStockData = [

  { id: '1', name: 'Elegant Gown', category: 'Wedding Gown', imageUrl: 'https://picsum.photos/150/150', stock: 5 },
  { id: '2', name: 'Classic Tuxedo', category: 'Suits', imageUrl: 'https://picsum.photos/200/200', stock: 3 },
  { id: '3', name: 'Modern Dress', category: 'Wedding Dress', imageUrl: 'https://picsum.photos/200/300', stock: 7 },
  { id: '4', name: 'Slim Fit Suit', category: 'Suits', imageUrl: 'https://picsum.photos/200/100', stock: 4 },
  { id: '5', name: 'Princess Gown', category: 'Wedding Gown', imageUrl: 'https://picsum.photos/200/230', stock: 2 },
  { id: '6', name: 'Mermaid Dress', category: 'Wedding Dress', imageUrl: 'https://picsum.photos/200/200', stock: 6 },
  { id: '7', name: 'Classic Black Suit', category: 'Suits', imageUrl: 'https://picsum.photos/200/201', stock: 8 },
  { id: '8', name: 'A-Line Wedding Dress', category: 'Wedding Dress', imageUrl: 'https://picsum.photos/200/205', stock: 1 },
  { id: '9', name: 'Velvet Tuxedo', category: 'Suits', imageUrl: 'https://picsum.photos/200/204', stock: 3 },
  { id: '10', name: 'Boho Gown', category: 'Wedding Gown', imageUrl: 'https://picsum.photos/200/150', stock: 5 },
  { id: '11', name: 'Traditional Dress', category: 'Wedding Dress', imageUrl: 'https://picsum.photos/200/200', stock: 2 },
  { id: '12', name: 'Double-Breasted Suit', category: 'Suits', imageUrl: 'https://picsum.photos/200/180', stock: 6 },
  { id: '13', name: 'Elegant Gown', category: 'Wedding Gown', imageUrl: 'https://picsum.photos/150/150', stock: 5 },
  { id: '14', name: 'Classic Tuxedo', category: 'Suits', imageUrl: 'https://picsum.photos/200/200', stock: 3 },
  { id: '15', name: 'Modern Dress', category: 'Wedding Dress', imageUrl: 'https://picsum.photos/200/300', stock: 7 },
  { id: '16', name: 'Slim Fit Suit', category: 'Suits', imageUrl: 'https://picsum.photos/200/100', stock: 4 },
  { id: '17', name: 'Princess Gown', category: 'Wedding Gown', imageUrl: 'https://picsum.photos/200/230', stock: 2 },


];

const categories = ['All', 'Wedding Gown', 'Wedding Dress', 'Suits'];

export default function StockScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedImage, setSelectedImage] = useState(null);

  const filteredData = dummyStockData.filter(item => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleShare = async (item) => {
    try {
      await Share.share({
        message: `Check this out: ${item.name} (Stock: ${item.stock})\n${item.imageUrl}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: 16 }}>
      {/* Search */}
      <View style={styles.searchInput}>
        <Ionicons name='search' color={'gray'} size={20}/>
        <TextInput
        placeholder="Search by name..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        
      />
      </View>

      {/* Category Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            onPress={() => setActiveCategory(cat)}
            style={[
              styles.categoryButton,
              activeCategory === cat && styles.activeCategory,
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                activeCategory === cat && styles.activeCategoryText,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Item Cards */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ paddingBottom: 80 }}
        columnWrapperStyle={{ justifyContent: 'space-between', gap: 12 }}
        renderItem={({ item }) => (

          <View style={{ flex: 1, backgroundColor: 'white', elevation: 3, marginBottom: 15, paddingBottom: 20, borderRadius: 20 }}>
            <TouchableOpacity onPress={() => setSelectedImage(item.imageUrl)}>
              <Image source={{ uri: item.imageUrl }} style={styles.image} />
            </TouchableOpacity>
            <View style={{paddingLeft:10,paddingRight:5}}>
              <Text style={styles.cardText}>{item.name}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.stockText}>Stock: {item.stock}</Text>
                <TouchableOpacity onPress={() => { handleShare(item) }}>
                  <MaterialCommunityIcons name='share-all' color={'gray'} size={20} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

        )}
      />

      {/* Full Image Modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedImage(null)}
      >
        <TouchableOpacity style={styles.modalBackground} onPress={() => setSelectedImage(null)}>
          <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
        </TouchableOpacity>
      </Modal>
      <TouchableOpacity style={{height:62,width:62,borderRadius:10,backgroundColor:'#c69c6d',position:'absolute',justifyContent:'center',alignSelf:'flex-end',marginTop:'170%',marginRight:'10%',elevation:5}}>
        <Ionicons name='add' color={'white'} size={30} style={{alignSelf:'center'}}/>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    marginTop: 16,
    marginBottom: 12,
    padding: 5,
    backgroundColor: 'white',
    borderRadius: 12,
    flexDirection:'row',
    alignItems:'center'

  },
  categoryScroll: {
    marginBottom: 10,
    backgroundColor:'transparent',
  
    
    
  },
  categoryButton: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding:10,
    marginRight:7,
    height:40,
    textAlign:'center'

  },
  activeCategory: {
    backgroundColor: '#222',
    
  },
  categoryText: {
    fontSize: 13,
    color: '#555',
    padding:0
    
  },
  activeCategoryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  
  image: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  stockText: {
    fontSize: 14,
    color: '#777',
    marginVertical: 4,
  },
  shareBtn: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1E90FF',
    borderRadius: 8,
  },
  shareText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: width - 40,
    height: height * 0.6,
    borderRadius: 12,
  },
});
