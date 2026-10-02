"use client";

import MailApp from "@/components/MailApp";
import { installDemoApi } from "@/lib/demo/api";

// Runs before the session provider's first request, so the app loads the sample mailbox
installDemoApi();

export default function DemoPage() {
  return <MailApp demo />;
}
