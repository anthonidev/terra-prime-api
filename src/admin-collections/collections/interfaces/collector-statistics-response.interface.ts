export interface CollectorStatisticsResponse {
  collectorId: string;
  collectorDocument: string;
  collectorName: string;
  collectorEmail: string;
  numberOfClients: number;
  collectedAmountPEN: number;
  collectedAmountUSD: number;
  pendingAmountPEN: number;
  pendingAmountUSD: number;
}
