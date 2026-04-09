export interface MenuItem {
  name: string;
  tooltip?: string;
  disabled?: boolean;
  process: () => void;
}
