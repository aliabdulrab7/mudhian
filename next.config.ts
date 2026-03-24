import type { NextConfig } from "next";
// @ts-expect-error next-pwa lacks TS types
import withPWA from "next-pwa";

const baseConfig: NextConfig = {
  reactCompiler: true,
  // Allow Turbopack to coexist with next-pwa's webpack config
  turbopack: {},
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
})(baseConfig);
