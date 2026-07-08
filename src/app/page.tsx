"use client";

import { useState } from "react";
import LoginScreen from "@/components/LoginScreen";
import WizardShell from "@/components/wizard/WizardShell";
import OfflineBanner from "@/components/OfflineBanner";
import type { SessaoOperador } from "@/types";

export default function Home() {
  const [sessao, setSessao] = useState<SessaoOperador | null>(null);

  return (
    <>
      <OfflineBanner />
      {!sessao ? <LoginScreen onLogin={setSessao} /> : <WizardShell sessao={sessao} />}
    </>
  );
}
