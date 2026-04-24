import { Platform } from "react-native";

export type Theme = {
  name: string;
  dark: boolean;
  fonts: any;
  price: number;
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
  name: 'Default',
  dark: false,
  fonts: navFonts,
  price: 0,
  colors: {
    primary: '#84A98C', 
    secondary1: '#2F3E46', 
    secondary2: '#f7f3e9',
    text1: '#354F52',
    text2: '#52796F',
    card: '#b8d7be', 
    text: '#354F52',
    border: 'transparent',
    notification: '#ff0000',
    background: '#D6E0C9',
  },
};

export const BlueTheme = {
  name: 'Blue',
  dark: false,
  fonts: navFonts,
  price: 150,
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
  name: 'Purple',
  dark: false,
  fonts: navFonts,
  price: 200,
  colors: {
    primary: '#8586b2',
    secondary1: '#bebfde',
    secondary2: '#f0ebe2',
    text1: '#6360a5',
    text2: '#93856a',
    card: '#b4a1be',     
    text: '#73749a',    
    border: 'transparent',
    notification: '#ff0000',
    background: '#d4d2ce',
  },
}

export const BeigeTheme = {
  name: 'Beige',
  dark: true,
  fonts: navFonts,
  price: 200,
  colors: {
    primary: '#7fc4bd',
    secondary1: '#a4bbcf',
    secondary2: '#f3e9d4',
    text1: '#4e3425',
    text2: '#4b4748',
    card: '#fffaf2',
    text: '#605c59',
    border: '#f2d2bb',
    notification: '#d24949',
    background: '#eee7d5',
  },
};

export const themes = {
  default: DefaultTheme,
  blue: BlueTheme,
  purple: PurpleTheme,
  beige: BeigeTheme
};

export type ThemeName = keyof typeof themes;
