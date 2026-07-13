export type CameraStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'unavailable' | 'error' | 'paused';

export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
  kind: 'videoinput';
}
