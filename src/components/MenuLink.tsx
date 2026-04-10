import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import { useNavigation, NavigationProp } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'

interface MenuLinkProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  styles: {
    menuItem: any;
    menuIconContainer: any;
    menuItemTitle: any;
    menuItemSubtitle: any;
  };
  iconBg: string;
  screen?: string;          
}

export default function MenuLink({ icon, title, subtitle, styles, iconBg, screen }: MenuLinkProps) {
    const navigation = useNavigation<NavigationProp<any>>()

    const handlePress = () => {
        if (screen) {
        navigation.navigate(screen);
        }
    }
  return (
    <TouchableOpacity style={styles.menuItem} onPress={handlePress}>
        <View style={[styles.menuIconContainer, {backgroundColor: iconBg}]}>
            <Ionicons name={icon} size={22} color="#4A5D45" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuItemTitle}>{title}</Text>
                <Text style={styles.menuItemSubtitle}>{subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C4C4C4" />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({})