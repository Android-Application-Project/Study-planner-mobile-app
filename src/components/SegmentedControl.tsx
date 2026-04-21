import React, { useRef, useEffect, useState } from 'react'
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  Dimensions, 
  ViewStyle 
} from 'react-native'

interface SegmentedControlProps {
    values: string[]
    selectedIndex: number
    onChange: (index: number) => void
    style?: ViewStyle
}

const { width } = Dimensions.get('window')
const SEGMENT_WIDTH = (width * 0.9) / 2 

export default function AppSegmentedControl({
  values = [],
  selectedIndex = 0,
  onChange,
  style,
}: SegmentedControlProps) {

  const [containerWidth, setContainerWidth] = React.useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const segmentWidth = containerWidth ? (containerWidth - 4) / values.length : 0;

  useEffect(() => {
    if (segmentWidth > 0) {
      Animated.spring(translateX, {
        toValue: selectedIndex * segmentWidth,
        useNativeDriver: true,
        bounciness: 7,
        speed: 5,
      }).start();
    }
  }, [selectedIndex, segmentWidth]);

  return (
    <View 
      style={[styles.container, style]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {segmentWidth > 0 && (
        <Animated.View 
          style={[
            styles.indicator, 
            { 
              width: segmentWidth,
              transform: [{ translateX }] 
            }
          ]} 
        />
      )}
      
      {values.map((label, index) => (
        <TouchableOpacity
          key={label}
          activeOpacity={0.7}
          onPress={() => onChange(index)}
          style={styles.segment}
        >
          <Text style={[styles.text, selectedIndex === index ? styles.activeText : styles.inactiveText]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 40,
    width: '90%',
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    alignSelf: 'center',
    marginVertical: 10,
    padding: 2,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 3,
  },
  segment: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeText: {
    color: '#000',
  },
  inactiveText: {
    color: '#8E8E93',
  },
})