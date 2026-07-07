"use client";

import { useState } from "react";
import LoginScreen from "@/components/LoginScreen";
import WizardShell from "@/components/wizard/WizardShell";
import type { SessaoOperador } from "@/types";

export default function Home() {
  const [sessao, setSessao] = useState<SessaoOperador | null>(null);

  if (!sessao) {
    return <LoginScreen onLogin={setSessao} />;
  }

  return <WizardShell sessao={sessao} />;
}
