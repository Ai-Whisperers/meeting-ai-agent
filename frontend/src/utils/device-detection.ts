/**
 * Device Detection Utility
 * Detects if the user is on a mobile device (phone/tablet) vs desktop
 */

export type DeviceType = 'mobile' | 'desktop';

export interface DeviceInfo {
  type: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isPhone: boolean;
  isDesktop: boolean;
  userAgent: string;
  platform: string;
}

/**
 * Detect if the current device is a mobile device (phone or tablet)
 * Note: Laptops and notebooks are NOT considered mobile
 */
export function detectDevice(): DeviceInfo {
  const userAgent = navigator.userAgent || '';
  const platform = navigator.platform || '';

  // Check for mobile/tablet indicators in user agent
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUA = mobileRegex.test(userAgent);

  // Check for tablet-specific patterns
  const tabletRegex = /iPad|Android(?!.*Mobile)|Tablet|PlayBook/i;
  const isTablet = tabletRegex.test(userAgent);

  // Check for phone-specific patterns
  const phoneRegex = /iPhone|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i;
  const isPhone = phoneRegex.test(userAgent);

  // Touch capability check (mobile devices typically have touch)
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Screen size check (mobile devices typically have smaller screens)
  const isMobileScreen = window.innerWidth <= 768;

  // Platform check (exclude common desktop platforms)
  const desktopPlatforms = ['Win32', 'Win64', 'Windows', 'MacIntel', 'Linux x86_64', 'Linux i686'];
  const isPlatformDesktop = desktopPlatforms.some(p => platform.includes(p));

  // Final determination:
  // - If it's a phone or tablet based on UA, it's mobile
  // - If it has a desktop platform AND no mobile UA, it's desktop
  // - If it has touch + small screen + no desktop platform, it's mobile
  let isMobile: boolean;

  if (isPhone || isTablet) {
    isMobile = true;
  } else if (isPlatformDesktop && !isMobileUA) {
    isMobile = false;
  } else if (hasTouch && isMobileScreen && !isPlatformDesktop) {
    isMobile = true;
  } else {
    isMobile = false;
  }

  return {
    type: isMobile ? 'mobile' : 'desktop',
    isMobile,
    isTablet,
    isPhone,
    isDesktop: !isMobile,
    userAgent,
    platform
  };
}

/**
 * Check if the current device is mobile
 */
export function isMobileDevice(): boolean {
  return detectDevice().isMobile;
}

/**
 * Check if the current device is desktop
 */
export function isDesktopDevice(): boolean {
  return detectDevice().isDesktop;
}

/**
 * Get a human-readable device description
 */
export function getDeviceDescription(): string {
  const device = detectDevice();

  if (device.isPhone) {
    return 'Mobile Phone';
  } else if (device.isTablet) {
    return 'Tablet';
  } else {
    return 'Desktop';
  }
}

/**
 * Log device information for debugging
 */
export function logDeviceInfo(): void {
  const device = detectDevice();
  console.log('🔍 Device Detection:', {
    type: device.type,
    description: getDeviceDescription(),
    isMobile: device.isMobile,
    isPhone: device.isPhone,
    isTablet: device.isTablet,
    isDesktop: device.isDesktop,
    userAgent: device.userAgent,
    platform: device.platform,
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    touchSupport: 'ontouchstart' in window
  });
}
