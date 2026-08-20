export interface ActionButton {
  icon: string;
  tooltip: string;
  isVisible: boolean;
  handler: () => void;
  svgFill?: true;
}
