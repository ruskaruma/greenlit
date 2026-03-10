# Greenlit — Known Issues

## Open

### Low Priority
- **AppSidebar client links**: Sidebar navigation doesn't link individual clients to `/clients/[id]` (only ScriptCard, ChaserCard, ScriptDetailSheet have links). Could add a client list section to sidebar.
- **Instagram insights rate limiting**: `fetchInsights` calls per-media-item sequentially via `Promise.all` — could hit Graph API rate limits on accounts with many posts. Consider batching.
- **YouTube `averageViewDuration`**: Spec mentions it but YouTube Data API v3 doesn't return it in `/videos` stats endpoint (requires YouTube Analytics API with OAuth). Currently returns ISO 8601 `duration` from `contentDetails` instead.

## Resolved
- Phase 8: All placeholder pages replaced with real content
- Phase 9A: Cron, rate limiting, light theme, escalation all working
- Phase 9B: Memory consolidation, channel strategy integrated into graph
- Phase 9C: Client detail page, Instagram/YouTube APIs, client name links all implemented
