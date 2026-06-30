import { z } from "zod";

import { getServerConfig } from "../config.server";

// SPA-compatible: regular async function instead of createServerFn
export const getGreeting = async (data: { name: string }) => {
  const config = getServerConfig();
  return {
    greeting: `Hello, ${data.name}!`,
    mode: config.nodeEnv ?? "unknown",
  };
};
