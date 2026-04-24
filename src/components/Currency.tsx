import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import { useTheme } from '../utils/ThemeContext'

type Props = {
  amount: number
  size?: number
}

export default function Currency({ amount, size = 16 }: Props) {
  const { theme } = useTheme()

  return (
    <View style={styles.row}>
      <FontAwesome5
        name='coins' 
        size={size}
        color={theme.colors.text}
      />
      <Text style={[styles.text, { color: theme.colors.text1 }]}>
        {amount}
      </Text>
    </View>
  )
}

export const formatCurrency = (amount: number) => {
  return `${amount}`
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    marginLeft: 4,
    fontWeight: '600',
  },
})