import { createTheme, type MantineColorsTuple } from '@mantine/core';

const ember: MantineColorsTuple = [
  '#fff3e8', '#ffe1c7', '#ffc391', '#ffa257', '#ff8a2e',
  '#ff7a1a', '#e66a0f', '#bf550a', '#994307', '#733204',
];

// dark[0] testo, [2] testo attenuato, [4] bordi, [5] hover, [6] pannelli, [7] sfondo
const dark: MantineColorsTuple = [
  '#ececf1', '#c1c4ce', '#8b90a0', '#666b7a', '#2a2e39',
  '#1f222b', '#15171d', '#0d0e12', '#0a0b0e', '#060709',
];

export const theme = createTheme({
  primaryColor: 'ember',
  primaryShade: 5,
  autoContrast: true,
  colors: { ember, dark },
  defaultRadius: 'md',
  fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  headings: { fontFamily: 'Rajdhani, Inter, sans-serif', fontWeight: '700' },
  components: {
    Card: { defaultProps: { radius: 'lg' } },
    Paper: { defaultProps: { radius: 'lg' } },
    Drawer: { defaultProps: { overlayProps: { backgroundOpacity: 0.6, blur: 2 } } },
    Modal: { defaultProps: { overlayProps: { backgroundOpacity: 0.6, blur: 2 } } },
  },
});
