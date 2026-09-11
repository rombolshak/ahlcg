export interface MenuItem {
  name: string;
  tooltip?: string;
  disabled?: boolean;
  busy?: boolean;
  process: () => void;
}
