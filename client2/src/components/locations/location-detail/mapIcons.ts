import L from 'leaflet';

export function pinIcon(color: string, label: string) {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center">
      <div style="background:${color};color:white;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.4)">${label}</div>
      <div style="width:2px;height:8px;background:${color}"></div>
      <div style="width:8px;height:8px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>
    </div>`,
    iconSize: [40, 30],
    iconAnchor: [20, 30],
  });
}

export const START_ICON = pinIcon('#22c55e', 'START');
export const END_ICON = pinIcon('#ef4444', 'END');
