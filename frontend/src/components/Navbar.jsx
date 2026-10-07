import React, { useState } from "react";
import { useWallet } from "../context/WalletContext";
import {
  ShieldCheck,
  GraduationCap,
  Building2,
  ScanSearch,
  Wallet,
  TriangleAlert,
  Loader2,
  ChevronDown,
  Copy,
  Check
} from "lucide-react";
import Icon from "./Icon";
import WalletModal from "./WalletModal";

export default function Navbar({ activeTab, setActiveTab }) {
  const {
    account,
    chainId,
    isConnecting,
    switchNetwork,
    isSupportedNetwork,
    hasWallet,
    HARDHAT_ACCOUNTS
  } = useWallet();

  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = (e) => {
    e.stopPropagation();
    if (!account) return;
    navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const getNetworkBadge = () => {
    if (!account) return null;
    if (chainId === 31337 || chainId === 1337) {
      return (
        <span className="badge badge-success">
          <span className="status-dot active"></span> Hardhat Localhost
        </span>
      );
    }
    if (chainId === 11155111) {
      return (
        <span className="badge badge-cyan">
          <span className="status-dot cyan"></span> Sepolia Testnet
        </span>
      );
    }
    return (
      <button
        onClick={() => switchNetwork(31337)}
        className="badge badge-danger"
        style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
      >
        <Icon icon={TriangleAlert} size={14} color="danger" /> Wrong Network (Click to Switch)
      </button>
    );
  };

  const getRoleTag = () => {
    if (!account || !HARDHAT_ACCOUNTS) return null;
    const lower = account.toLowerCase();
    if (lower === HARDHAT_ACCOUNTS[0].address.toLowerCase()) {
      return <span className="badge badge-primary" style={{ fontSize: "0.68rem", padding: "1px 6px" }}>Issuer #0</span>;
    }
    if (lower === HARDHAT_ACCOUNTS[1].address.toLowerCase()) {
      return <span className="badge badge-cyan" style={{ fontSize: "0.68rem", padding: "1px 6px" }}>Student #1</span>;
    }
    if (lower === HARDHAT_ACCOUNTS[2].address.toLowerCase()) {
      return <span className="badge badge-cyan" style={{ fontSize: "0.68rem", padding: "1px 6px" }}>Student #2</span>;
    }
    return null;
  };

  return (
    <header style={{ borderBottom: "1px solid var(--border)", background: "rgba(10, 13, 12, 0.9)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}>
      {!isSupportedNetwork && account && (
        <div style={{ background: "var(--danger-bg)", borderBottom: "1px solid var(--danger-border)", padding: "10px 24px", textAlign: "center", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", color: "var(--danger)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontWeight: "600" }}>
            <Icon icon={TriangleAlert} size={18} color="danger" />
            Unsupported Network (Chain ID: {chainId}). Switch to Hardhat Localhost (31337) to interact.
          </span>
          <button onClick={() => switchNetwork(31337)} className="btn btn-danger" style={{ padding: "4px 12px", fontSize: "0.8rem" }}>
            Switch to Hardhat (31337)
          </button>
        </div>
      )}

      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "72px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }} onClick={() => setActiveTab("student")}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #C6FF3D 0%, #22E1FF 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(198, 255, 61, 0.35)"
            }}
          >
            <Icon icon={ShieldCheck} size={24} color="ink" />
          </div>
          <div>
            <div style={{ fontSize: "1.25rem", fontWeight: "800", letterSpacing: "-0.02em", fontFamily: "var(--font-display)" }}>
              Chain<span style={{ color: "var(--primary)" }}>Proof</span>
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: "600" }}>
              Zero-Knowledge Verification
            </div>
          </div>
        </div>

        <nav className="nav-tabs" style={{ display: "flex", gap: "6px", background: "var(--surface)", padding: "5px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
          <button
            onClick={() => setActiveTab("student")}
            className={`btn ${activeTab === "student" ? "btn-primary" : "btn-outline"}`}
            style={{ padding: "8px 16px", fontSize: "0.85rem", border: activeTab === "student" ? "none" : undefined }}
          >
            <Icon icon={GraduationCap} size={16} /> Student Portal
          </button>
          <button
            onClick={() => setActiveTab("issuer")}
            className={`btn ${activeTab === "issuer" ? "btn-primary" : "btn-outline"}`}
            style={{ padding: "8px 16px", fontSize: "0.85rem", border: activeTab === "issuer" ? "none" : undefined }}
          >
            <Icon icon={Building2} size={16} /> Issuer Dashboard
          </button>
          <button
            onClick={() => setActiveTab("verifier")}
            className={`btn ${activeTab === "verifier" ? "btn-primary" : "btn-outline"}`}
            style={{ padding: "8px 16px", fontSize: "0.85rem", border: activeTab === "verifier" ? "none" : undefined }}
          >
            <Icon icon={ScanSearch} size={16} /> Verifier Audit
          </button>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {getNetworkBadge()}

          {account ? (
            <button
              onClick={() => setIsWalletModalOpen(true)}
              className="wallet-pill-btn"
              title="Click to switch account or disconnect"
            >
              <Icon icon={Wallet} size={15} color="primary" />
              <span className="status-dot active"></span>
              <span className="mono" style={{ fontWeight: "600", fontSize: "0.85rem" }}>
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
              {getRoleTag()}
              <span
                onClick={handleCopyAddress}
                title="Copy full address"
                style={{ display: "inline-flex", alignItems: "center", marginLeft: "2px", opacity: 0.7 }}
              >
                <Icon icon={copied ? Check : Copy} size={13} color={copied ? "primary" : "muted"} />
              </span>
              <Icon icon={ChevronDown} size={14} color="muted" />
            </button>
          ) : (
            <button
              onClick={() => setIsWalletModalOpen(true)}
              disabled={isConnecting}
              className="btn btn-primary"
              style={{ padding: "8px 18px", fontSize: "0.85rem" }}
            >
              {isConnecting ? (
                <>
                  <Icon icon={Loader2} size={16} spin /> Connecting...
                </>
              ) : hasWallet ? (
                <>
                  <Icon icon={Wallet} size={16} /> Connect Wallet
                </>
              ) : (
                <>
                  <Icon icon={Wallet} size={16} /> Connect Local Account
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </header>
  );
}
