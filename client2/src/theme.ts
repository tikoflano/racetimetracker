import { createTheme, MantineColorsTuple } from '@mantine/core';

/**
 * Custom color palettes (10 shades each, 0=lightest, 9=darkest).
 * Primary: #313B72, Success: #7A9B76, Danger: #AC3931, Warning: #ECE2D0
 */

// Dark theme colors
const dark: MantineColorsTuple = [
  '#C1C2C5',
  '#A6A7AB',
  '#909296',
  '#5c5f66',
  '#373A40',
  '#2C2E33',
  '#1e2028',
  '#13151b',
  '#0f1117',
  '#0a0b0e',
];

export const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'sm',
  colors: {
    dark,
    // Primary: #313B72 (dark blue)
    blue: [
      '#F4F5F8',
      '#E9EAEF',
      '#D3D6DF',
      '#A3A8BF',
      '#6B7198',
      '#4A5182',
      '#313B72',
      '#2A3364',
      '#232B56',
      '#1C2348',
    ],
    // Success: #7A9B76 (sage green)
    green: [
      '#F4F7F4',
      '#E9F0E9',
      '#C2DCC2',
      '#9BC89B',
      '#7A9B76',
      '#6B8A67',
      '#5C7958',
      '#4D6849',
      '#3E573A',
      '#2F462B',
    ],
    // Danger: #AC3931 (red)
    red: [
      '#FDF2F2',
      '#FBE5E5',
      '#F7CCCC',
      '#F09999',
      '#E86666',
      '#D94747',
      '#AC3931',
      '#9A2F28',
      '#88261F',
      '#761C16',
    ],
    // Warning: #ECE2D0 (cream/beige)
    yellow: [
      '#FDFCFA',
      '#FBF8F4',
      '#F7F1E9',
      '#F3EADE',
      '#EFE3D3',
      '#ECE2D0',
      '#D4C9B8',
      '#BCB0A0',
      '#A49788',
      '#8C7E70',
    ],
  },
  components: {
    Paper: {
      defaultProps: {
        radius: 'md',
      },
    },
  },
});
