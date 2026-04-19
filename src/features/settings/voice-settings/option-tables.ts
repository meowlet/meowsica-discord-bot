export interface SpeedOption {
  readonly label: string;
  readonly value: string;
  readonly description?: string;
}

export const BASIC_SPEED_OPTIONS: readonly SpeedOption[] = [
  { label: "speedNormal", value: "1.0", description: "speedNormalDesc" },
  { label: "speedSlow", value: "0.25", description: "speedSlowDesc" },
];

export const WAVENET_SPEED_OPTIONS: readonly SpeedOption[] = [
  { label: "speed025x", value: "0.25" },
  { label: "speed05x", value: "0.5" },
  { label: "speed075x", value: "0.75" },
  { label: "speed10x", value: "1.0" },
  { label: "speed125x", value: "1.25" },
  { label: "speed15x", value: "1.5" },
  { label: "speed20x", value: "2.0" },
  { label: "speed30x", value: "3.0" },
  { label: "speed40x", value: "4.0" },
];

export interface PitchOption {
  readonly label: string;
  readonly value: string;
  readonly description: string;
}

export const PITCH_OPTIONS: readonly PitchOption[] = [
  { label: "pitchDeep", value: "-5.0", description: "pitchDeepDesc" },
  { label: "pitchMediumLow", value: "-2.5", description: "pitchMediumLowDesc" },
  { label: "pitchNormal", value: "0.0", description: "pitchNormalDesc" },
  {
    label: "pitchMediumHigh",
    value: "2.5",
    description: "pitchMediumHighDesc",
  },
  { label: "pitchHigh", value: "5.0", description: "pitchHighDesc" },
];
