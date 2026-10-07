import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useWallet } from "../context/WalletContext";
import {
  Wallet,
  X,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  Building2,
  GraduationCap,
  Zap
} from "lucide-react";
import Icon from "./Icon";

export default function WalletModal({ isOpen, onClose }) {
  const {
    account,
    balance,
    walletMode,
    connectWallet,
    switchAccountMetaMask,
    selectLocalAccount,
    disconnectWallet,
    HARDHAT_ACCOUNTS,
    hasWallet,
    error
  } = useWallet();

  const [copied, setCopied] = useState(false);

  if (!isOpen || typeof document === "undefined") return null;

  const handleCopy = () => {
    if (!account) return;
    navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRoleBadge = (addr) => {
    if (!addr) return null;
    const lower = addr.toLowerCase();
    if (lower === HARDHAT_ACCOUNTS[0].address.toLowerCase()) {
      return {
        label: "Issuer (Admin)",
        icon: Building2,
        color: "primary",
        desc: "Authorized ISSUER_ROLE holder"
      };
    }
    if (lower === HARDHAT_ACCOUNTS[1].address.toLowerCase()) {
      return {
        label: "Student (STU001)",
        icon: GraduationCap,
        color: "secondary",
        desc: "Demo credential STU001 holder"
      };
    }
    if (lower === HARDHAT_ACCOUNTS[2].address.toLowerCase()) {
      return {
        label: "Student (STU002)",
        icon: GraduationCap,
        color: "secondary",
        desc: "Demo credential STU002 holder"
      };
    }
    return {
      label: "Standard Account",
      icon: Wallet,
      color: "muted",
      desc: "Connected Web3 account"
    };
  };

  const currentRole = getRoleBadge(account);

  const modalContent = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        background: "rgba(3, 5, 4, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}
      onClick={onClose}
    >
      <div
        className="modal-scroll"
        style={{
          width: "100%",
          maxWidth: "520px",
          maxHeight: "88vh",
          overflowY: "auto",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(198, 255, 61, 0.12)",
          padding: "26px",
          color: "var(--text)",
          position: "relative"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "rgba(198, 255, 61, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Icon icon={Wallet} size={22} color="primary" />
            </div>
            <div>
              <div style={{ fontWeight: "700", fontSize: "1.15rem", fontFamily: "var(--font-display)" }}>
                Wallet & Account Switcher
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Select active signer or switch between demo accounts
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="btn btn-outline"
            style={{ padding: "6px", border: "none", borderRadius: "50%", width: "32px", height: "32px" }}
          >
            <Icon icon={X} size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              background: "var(--danger-bg)",
              border: "1px solid var(--danger-border)",
              borderRadius: "var(--radius-md)",
              fontSize: "0.85rem",
              color: "var(--danger)",
              marginBottom: "16px"
            }}
          >
            {error}
          </div>
        )}

        {account ? (
          <div
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "16px",
              marginBottom: "20px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="status-dot active"></span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "600" }}>
                  Active Signer
                </span>
                <span
                  className={`badge ${walletMode === "local" ? "badge-primary" : "badge-cyan"}`}
                  style={{ fontSize: "0.7rem", padding: "2px 8px" }}
                >
                  {walletMode === "local" ? "Local Hardhat" : "MetaMask"}
                </span>
              </div>
              {balance && (
                <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text)" }}>
                  {balance}
                </div>
              )}
            </div>

            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.85rem",
                color: "var(--primary)",
                wordBreak: "break-all",
                marginBottom: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(0, 0, 0, 0.4)",
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)"
              }}
            >
              <span>{account}</span>
              <button
                onClick={handleCopy}
                aria-label="Copy active wallet address"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: copied ? "var(--primary)" : "var(--text-muted)",
                  marginLeft: "8px",
                  display: "inline-flex",
                  alignItems: "center"
                }}
              >
                <Icon icon={copied ? Check : Copy} size={16} />
              </button>
            </div>

            {currentRole && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                <Icon icon={currentRole.icon} size={15} color={currentRole.color} />
                <span>
                  <strong>{currentRole.label}:</strong> {currentRole.desc}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: "20px",
              background: "var(--surface-2)",
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-md)",
              textAlign: "center",
              marginBottom: "20px"
            }}
          >
            <div style={{ marginBottom: "12px", color: "var(--text-muted)", fontSize: "0.9rem" }}>
              No wallet currently connected. Select an option below:
            </div>
            {hasWallet && (
              <button
                onClick={() => {
                  connectWallet();
                  onClose();
                }}
                className="btn btn-primary"
                style={{ width: "100%", padding: "10px" }}
              >
                <Icon icon={Wallet} size={16} /> Connect with MetaMask
              </button>
            )}
          </div>
        )}

        <div style={{ marginBottom: "22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              1-Click Local Accounts (Hardhat 31337)
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "4px", fontWeight: "600" }}>
              <Icon icon={Zap} size={13} color="primary" /> No MetaMask needed
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {HARDHAT_ACCOUNTS.map((acc) => {
              const isActive =
                account &&
                account.toLowerCase() === acc.address.toLowerCase() &&
                walletMode === "local";

              return (
                <div
                  key={acc.index}
                  onClick={() => {
                    selectLocalAccount(acc.index);
                    onClose();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    background: isActive ? "rgba(198, 255, 61, 0.08)" : "var(--surface-2)",
                    border: isActive ? "1px solid var(--primary)" : "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: acc.role === "Issuer" ? "rgba(198, 255, 61, 0.15)" : "rgba(34, 225, 255, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <Icon
                        icon={acc.role === "Issuer" ? Building2 : GraduationCap}
                        size={16}
                        color={acc.role === "Issuer" ? "primary" : "secondary"}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>{acc.label}</span>
                        <span className={`badge ${acc.role === "Issuer" ? "badge-primary" : "badge-cyan"}`} style={{ fontSize: "0.65rem", padding: "1px 6px" }}>
                          {acc.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        {acc.address.slice(0, 10)}...{acc.address.slice(-6)}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isActive ? (
                      <span className="badge badge-primary" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <Icon icon={Check} size={12} color="primary" /> Active
                      </span>
                    ) : (
                      <button
                        className="btn btn-outline"
                        style={{ padding: "6px 14px", fontSize: "0.75rem" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectLocalAccount(acc.index);
                          onClose();
                        }}
                      >
                        Switch
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {hasWallet && (
          <div
            style={{
              padding: "16px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              marginBottom: "20px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Icon icon={Wallet} size={16} color="primary" />
                <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>MetaMask Extension</span>
              </div>
              {walletMode === "metamask" && account && (
                <span className="badge badge-cyan" style={{ fontSize: "0.65rem" }}>
                  Active Provider
                </span>
              )}
            </div>

            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "12px", lineHeight: "1.4" }}>
              Opens MetaMask's native account switcher so you can choose which MetaMask account to authorize and use.
            </p>

            <button
              onClick={async () => {
                await switchAccountMetaMask();
                onClose();
              }}
              className="btn btn-outline"
              style={{ width: "100%", padding: "10px", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
              <Icon icon={RefreshCw} size={15} /> Switch Account in MetaMask
            </button>
          </div>
        )}

        {account && (
          <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
            <button
              onClick={() => {
                disconnectWallet();
                onClose();
              }}
              className="btn btn-danger"
              style={{ padding: "8px 16px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Icon icon={LogOut} size={15} color="danger" /> Disconnect Wallet
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
