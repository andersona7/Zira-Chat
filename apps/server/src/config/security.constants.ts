export const SECURITY_CONFIG = {
  ACCESS_TOKEN_LIFETIME: '10m', // 10 minutes
  REFRESH_TOKEN_MAX_AGE: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
  IDLE_TIMEOUT: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  MAX_SESSIONS_PER_USER: 10,
  COOKIE_NAME: 'zira_refresh',
  RISK_THRESHOLDS: {
    LOW: 30,
    MEDIUM: 60,
  },
  PASSWORD_HISTORY_LIMIT: 5,
};
