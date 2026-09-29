export interface SystemStatus {
  status: "ok";
  timestamp: string;
}

export function getSystemStatus(): SystemStatus {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
}
