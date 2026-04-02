export interface MenuItem {
  name: string;
  tooltip?: string;
  process: () => void;
}
