import * as UAParserLib from 'ua-parser-js';

export interface DeviceInfo {
  deviceName: string;
  browser: string;
  browserVersion: string;
  os: string;
  platform: string;
  userAgent: string;
}

export const parseUserAgent = (userAgentString: string): DeviceInfo => {
  const parser = new UAParserLib.UAParser(userAgentString);
  const result = parser.getResult();

  const browserName = result.browser.name || 'Unknown Browser';
  const browserVer = result.browser.version || 'Unknown';
  const osName = result.os.name || 'Unknown OS';
  const osVer = result.os.version ? ` ${result.os.version}` : '';
  const deviceVendor = result.device.vendor || '';
  const deviceModel = result.device.model || '';

  let platform = 'desktop';
  if (result.device.type === 'mobile') {
    platform = 'mobile';
  } else if (result.device.type === 'tablet') {
    platform = 'tablet';
  }

  // Construct readable device name
  let deviceName = '';
  if (deviceVendor || deviceModel) {
    deviceName = `${deviceVendor} ${deviceModel}`.trim();
  } else {
    deviceName = `${browserName} on ${osName}${osVer}`;
  }

  return {
    deviceName,
    browser: browserName,
    browserVersion: browserVer,
    os: `${osName}${osVer}`,
    platform,
    userAgent: userAgentString,
  };
};
