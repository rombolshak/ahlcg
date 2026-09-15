export interface MenuItem {
  name: string;
  tooltip?: { key: string; params?: Record<string, unknown> };
  disabled?: boolean;
  busy?: boolean;
  process: () => void;
}
