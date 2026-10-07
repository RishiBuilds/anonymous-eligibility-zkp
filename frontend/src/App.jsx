import React, { useState } from "react";
import { WalletProvider, useWallet } from "./context/WalletContext";
import Navbar from "./components/Navbar";
import StudentView from "./components/StudentView";
import IssuerView from "./components/IssuerView";
import VerifierView from "./components/VerifierView";

import { ShieldCheck, Copy, Check, ExternalLink } from "lucide-react";
import Icon from "./components/Icon";

function MainContent() {
  const [activeTab, setActiveTab] = useState("student");
  const [targetProofId, setTargetProofId] = useState("");
  const { registryAddress, chainId } = useWallet();
  const [copiedContract, setCopiedContract] = useState(false);

  const handleNavigateToVerifier = (proofId) => {
    setTargetProofId(proofId);
    setActiveTab("verifier");
  };

  const handleCopyContract = () => {
    if (!registryAddress) return;
    navigator.clipboard.writeText(registryAddress);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="container" style={{ flex: 1, padding: "36px 24px 60px" }}>
        {activeTab === "student" && <StudentView onNavigateToVerifier={handleNavigateToVerifier} />}
        {activeTab === "issuer" && <IssuerView />}
        {activeTab === "verifier" && <VerifierView initialProofId={targetProofId} />}
      </main>

      <footer style={{ borderTop: "1px solid var(--border)", background: "var(--surface)", padding: "20px 0", marginTop: "auto", fontSize: "0.82rem", color: "var(--text-muted)" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: "700", color: "var(--text)" }}>
              <Icon icon={ShieldCheck} size={16} color="primary" /> ChainProof
            </span>
            <span>•</span>
            <span>Privacy-Preserving Groth16 ZK-SNARK Verification</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>
            <span style={{ color: "var(--text-dim)" }}>Registry:</span>
            <span style={{ color: "var(--primary)" }}>{registryAddress}</span>
            <button
              onClick={handleCopyContract}
              className="btn btn-outline"
              style={{ padding: "2px 6px", fontSize: "0.72rem" }}
              aria-label="Copy Registry Contract Address"
            >
              <Icon icon={copiedContract ? Check : Copy} size={12} color={copiedContract ? "primary" : "muted"} />
            </button>
            {chainId === 11155111 && (
              <a
                href={`https://sepolia.etherscan.io/address/${registryAddress}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline"
                style={{ padding: "2px 8px", fontSize: "0.72rem", display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--secondary)" }}
              >
                <span>Etherscan</span>
                <Icon icon={ExternalLink} size={11} color="secondary" />
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <MainContent />
    </WalletProvider>
  );
}
