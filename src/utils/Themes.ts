import { Platform } from "react-native";

export type Theme = {
  name: string;
  dark: boolean;
  fonts: any;
  colors: {
    primary: string;
    secondary1: string,
    secondary2: string,
    text1: string,
    text2: string,
    card: string;      // Header/Tab bar background
    text: string;      // Header/Tab bar text
    border: string;    // Lines between tabs
    notification: string;
    background: string;
  };
};

const navFonts = Platform.select({
  ios: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
  default: {
    regular: { fontFamily: 'sans-serif', fontWeight: 'normal' },
    medium: { fontFamily: 'sans-serif-medium', fontWeight: 'normal' },
    bold: { fontFamily: 'sans-serif', fontWeight: 'bold' },
    heavy: { fontFamily: 'sans-serif', fontWeight: 'bold' },
  },
});

export const DefaultTheme = {
  name: 'default',
  dark: false,
  fonts: navFonts,
  colors: {
    primary: '#84A98C', // Buttons, active tabs, links
    secondary1: '#2F3E46', 
    secondary2: '#CBF3BB',
    text1: '#354F52',
    text2: '#52796F',
    card: '#baceac',      
    text: '#354F52',     
    border: 'transparent',
    notification: '#ff0000',
    background: '#D6E0C9',
  },
};

export const Default1Theme = {
  name: 'default',
  dark: false,
  fonts: navFonts,
  colors: {
    primary: '#84A98C',
    secondary1: '#2F3E46',
    secondary2: '#CBF3BB',
    text1: '#354F52',
    text2: '#52796F',
    card: '#C2D1B8',      
    text: '#354F52',     
    border: 'transparent',
    notification: '#ff0000',
    background: '#CAD2C5',
  },
};

export const BlueTheme = {
  name: 'blue',
  dark: false,
  fonts: navFonts,
  colors: {
    primary: '#2196F3',
    secondary1: '#64B5F6',
    secondary2: '#BBDEFB',
    text1: '#0D47A1',
    text2: '#5472D3',
    card: '#BBDEFB',     
    text: '#0D47A1',    
    border: 'transparent',
    notification: '#ff0000',
    background: '#E3F2FD',
  },
};
export const PurpleTheme = {
  name: 'purple',
  dark: false,
  fonts: navFonts,
  colors: {
    primary: '#9C27B0',
    secondary1: '#BA68C8',
    secondary2: '#E1BEE7',
    text1: '#4A148C',
    text2: '#7B1FA2',
    card: '#E1BEE7',     
    text: '#4A148C',    
    border: 'transparent',
    notification: '#ff0000',
    background: '#F3E5F5',
  },
}

export const themes = {
  default: DefaultTheme,
  blue: BlueTheme,
  purple: PurpleTheme
};

export type ThemeName = keyof typeof themes;