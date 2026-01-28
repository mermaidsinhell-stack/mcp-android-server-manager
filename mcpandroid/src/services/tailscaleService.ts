/**
 * Tailscale Integration Service
 *
 * Detects Tailscale app installation, connection status, and IP address
 * Uses deep linking to guide users through Tailscale setup
 */

import { Linking, Platform } from 'react-native';
import * as Network from 'expo-network';
import { addBreadcrumb } from '../utils/sentry';

const TAILSCALE_PACKAGE = 'com.tailscale.ipn';
const TAILSCALE_PLAY_STORE_URL = `market://details?id=${TAILSCALE_PACKAGE}`;
const TAILSCALE_PLAY_STORE_WEB = `https://play.google.com/store/apps/details?id=${TAILSCALE_PACKAGE}`;
const TAILSCALE_DEEP_LINK = 'tailscale://';

export interface TailscaleStatus {
  installed: boolean;
  connected: boolean;
  ipAddress: string | null;
  error?: string;
}

class TailscaleService {
  private cachedIP: string | null = null;
  private lastCheck: number = 0;
  private readonly CACHE_DURATION = 5000; // 5 seconds

  /**
   * Check if Tailscale app is installed
   */
  async isInstalled(): Promise<boolean> {
    try {
      // Try to open Tailscale deep link
      const canOpen = await Linking.canOpenURL(TAILSCALE_DEEP_LINK);
      addBreadcrumb('Tailscale installation check', 'tailscale', { installed: canOpen });
      return canOpen;
    } catch (error) {
      console.error('Error checking Tailscale installation:', error);
      return false;
    }
  }

  /**
   * Open Tailscale app if installed, otherwise open Play Store
   */
  async open(): Promise<void> {
    const installed = await this.isInstalled();

    try {
      if (installed) {
        addBreadcrumb('Opening Tailscale app', 'tailscale');
        await Linking.openURL(TAILSCALE_DEEP_LINK);
      } else {
        addBreadcrumb('Opening Play Store for Tailscale', 'tailscale');
        try {
          await Linking.openURL(TAILSCALE_PLAY_STORE_URL);
        } catch {
          // Fallback to web Play Store if market:// fails
          await Linking.openURL(TAILSCALE_PLAY_STORE_WEB);
        }
      }
    } catch (error) {
      console.error('Error opening Tailscale:', error);
      throw new Error('Failed to open Tailscale. Please install it manually from Play Store.');
    }
  }

  /**
   * Detect if VPN is active (likely Tailscale)
   */
  async isVPNActive(): Promise<boolean> {
    try {
      const networkState = await Network.getNetworkStateAsync();

      // On Android, check if VPN is active
      // Note: This detects ANY VPN, not specifically Tailscale
      if (Platform.OS === 'android') {
        // When VPN is active, network type is often reported as VPN or UNKNOWN
        const isVpnLikely =
          networkState.type === Network.NetworkStateType.VPN ||
          networkState.type === Network.NetworkStateType.UNKNOWN;

        addBreadcrumb('VPN status check', 'tailscale', {
          active: isVpnLikely,
          type: networkState.type
        });

        return isVpnLikely;
      }

      return false;
    } catch (error) {
      console.error('Error checking VPN status:', error);
      return false;
    }
  }

  /**
   * Get Tailscale IP address by checking network interfaces
   * Tailscale IPs are in the 100.64.0.0/10 range (CGNAT range)
   */
  async getIPAddress(): Promise<string | null> {
    // Use cache if recent
    const now = Date.now();
    if (this.cachedIP && (now - this.lastCheck) < this.CACHE_DURATION) {
      return this.cachedIP;
    }

    try {
      const networkState = await Network.getNetworkStateAsync();

      if (!networkState.isConnected) {
        return null;
      }

      // Get IP address
      const ipAddress = await Network.getIpAddressAsync();

      // Check if it's a Tailscale IP (100.64.0.0/10 range)
      if (ipAddress && this.isTailscaleIP(ipAddress)) {
        this.cachedIP = ipAddress;
        this.lastCheck = now;

        addBreadcrumb('Tailscale IP detected', 'tailscale', { ip: ipAddress });
        return ipAddress;
      }

      // Not a Tailscale IP
      this.cachedIP = null;
      return null;
    } catch (error) {
      console.error('Error getting IP address:', error);
      return null;
    }
  }

  /**
   * Check if an IP address is in the Tailscale range (100.64.0.0/10)
   */
  private isTailscaleIP(ip: string): boolean {
    try {
      const parts = ip.split('.').map(Number);

      if (parts.length !== 4 || parts.some(isNaN)) {
        return false;
      }

      // Check if IP is in 100.64.0.0/10 range
      // First octet must be 100
      if (parts[0] !== 100) {
        return false;
      }

      // Second octet must be 64-127 (10 bits)
      if (parts[1] < 64 || parts[1] > 127) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get complete Tailscale status
   */
  async getStatus(): Promise<TailscaleStatus> {
    try {
      const installed = await this.isInstalled();
      const vpnActive = await this.isVPNActive();
      const ipAddress = await this.getIPAddress();

      const connected = vpnActive && ipAddress !== null;

      return {
        installed,
        connected,
        ipAddress,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        installed: false,
        connected: false,
        ipAddress: null,
        error: errorMessage,
      };
    }
  }

  /**
   * Generate server URL with Tailscale IP
   */
  getServerURL(port: number, ipAddress?: string): string | null {
    const ip = ipAddress || this.cachedIP;
    if (!ip) {
      return null;
    }
    return `http://${ip}:${port}`;
  }

  /**
   * Clear cached IP (call when network changes)
   */
  clearCache(): void {
    this.cachedIP = null;
    this.lastCheck = 0;
  }

  /**
   * Monitor network changes and clear cache
   */
  setupNetworkMonitoring(): void {
    // Note: In a real implementation, you'd set up a network state listener
    // For now, we rely on manual checks and cache expiration
    console.log('Tailscale network monitoring initialized');
  }
}

export const tailscaleService = new TailscaleService();
export default tailscaleService;
