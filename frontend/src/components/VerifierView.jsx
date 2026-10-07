import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import {
  ScanSearch,
  Search,
  CircleCheck,
  CircleX,
  Lock,
  Copy,
  Check,
  Loader2,
  Fingerprint,
  Wallet,
  Building2,
  Calendar,
  ReceiptText,
  ShieldCheck
} from "lucide-react";
import Icon from "./Icon";

export default function VerifierView({ initialProofId }) {
  const { contract } = useWallet();

  const [proofIdInput, setProofIdInput] = useState(initialProofId || "");
  const [verificationResult, setVerificationResult] = useState(null);
  const [nullifierStatus, setNullifierStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (text, key) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  useEffect(() => {
    if (initialProofId) {
      setProofIdInput(initialProofId);
      handleAuditProof(initialProofId);
    }
  }, [initialProofId]);

  const handleAuditProof = async (idToQuery) => {
    const id = (idToQuery || proofIdInput).trim();
    if (!id || !contract) return;
    setIsLoading(true);
    setErrorMessage(null);
    setVerificationResult(null);
    setNullifierStatus(null);

    try {
      let formattedId = id;
      if (!formattedId.startsWith("0x")) {
        formattedId = "0x" + formattedId;
      }
      if (formattedId.length !== 66) {
        setErrorMessage("Invalid proofId format. Must be a 32-byte hex string (0x followed by 64 hex characters).");
        setIsLoading(false);
        return;
      }

      const record = await contract.getVerification(formattedId);

      if (record && record.timestamp > 0n && record.valid) {
        setVerificationResult({
          proofId: record.proofId,
          nullifier: record.nullifier,
          recipient: record.recipient,
          issuer: record.issuer,
          scholarshipId: record.scholarshipId.toString(),
          timestamp: new Date(Number(record.timestamp) * 1000).toLocaleString(),
          valid: record.valid
        });

        const isNullifierUsed = await contract.isNullifierUsed(record.nullifier);
        setNullifierStatus(isNullifierUsed);
      } else {
        setVerificationResult({
          valid: false,
          notFound: true,
          queriedId: formattedId
        });
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "Failed to query verification status.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "840px", margin: "0 auto" }}>
      <div className="card card-accent-top">
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.35rem", display: "inline-flex", alignItems: "center", gap: "10px" }}>
            <Icon icon={ScanSearch} size={22} color="primary" /> Verifier & Employer Audit Portal
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            Audit on-chain scholarship qualification receipts with zero knowledge of student identity or academic records.
          </p>
        </div>

        {errorMessage && (
          <div style={{ background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "var(--radius-md)", padding: "12px 16px", marginBottom: "20px", fontSize: "0.88rem", color: "var(--danger)", display: "flex", alignItems: "center", gap: "10px" }}>
            <Icon icon={CircleX} size={18} color="danger" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Proof ID (32-byte unique verification identifier)</label>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              className="input-field mono"
              placeholder="0x..."
              value={proofIdInput}
              onChange={(e) => setProofIdInput(e.target.value)}
            />
            <button
              onClick={() => handleAuditProof(proofIdInput)}
              disabled={isLoading || !proofIdInput}
              className="btn btn-primary"
              style={{ whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              {isLoading ? (
                <>
                  <Icon icon={Loader2} size={16} spin color="ink" /> Querying...
                </>
              ) : (
                <>
                  <Icon icon={Search} size={16} color="ink" /> Audit Proof
                </>
              )}
            </button>
          </div>
        </div>

        {verificationResult && (
          <div style={{ marginTop: "28px" }}>
            {verificationResult.valid ? (
              <div
                style={{
                  background: "var(--surface-2)",
                  border: "2px solid var(--primary)",
                  borderRadius: "var(--radius-lg)",
                  padding: "26px",
                  boxShadow: "0 0 35px var(--primary-glow)",
                  position: "relative"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon icon={CircleCheck} size={26} color="ink" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "1.3rem", color: "var(--primary)", fontWeight: "800", letterSpacing: "-0.01em" }}>
                        ELIGIBILITY VERIFIED: VALID
                      </h3>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Student qualification confirmed mathematically via Groth16 zero-knowledge proof.
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-primary" style={{ padding: "6px 14px", fontSize: "0.85rem" }}>
                    100% Authentic
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", background: "rgba(0, 0, 0, 0.4)", padding: "20px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", fontSize: "0.85rem" }}>
                  <div>
                    <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.78rem" }}>Scholarship Scheme ID</span>
                    <strong className="mono" style={{ fontSize: "1.05rem", color: "var(--text)" }}>#{verificationResult.scholarshipId}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.78rem" }}>Block Verification Timestamp</span>
                    <strong style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--text)" }}>
                      <Icon icon={Calendar} size={14} color="muted" /> {verificationResult.timestamp}
                    </strong>
                  </div>

                  <div style={{ gridColumn: "span 2", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Claiming Wallet (Recipient Account)</span>
                      <button
                        onClick={() => handleCopy(verificationResult.recipient, "recipient")}
                        className="btn btn-outline"
                        style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                        aria-label="Copy Recipient Address"
                      >
                        <Icon icon={copiedKey === "recipient" ? Check : Copy} size={12} color={copiedKey === "recipient" ? "primary" : "muted"} />
                        <span style={{ marginLeft: "4px" }}>{copiedKey === "recipient" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <strong className="mono" style={{ color: "var(--secondary)", display: "inline-flex", alignItems: "center", gap: "6px", wordBreak: "break-all" }}>
                      <Icon icon={Wallet} size={14} color="secondary" /> {verificationResult.recipient}
                    </strong>
                  </div>

                  <div style={{ gridColumn: "span 2", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Issuing University (Deployer)</span>
                      <button
                        onClick={() => handleCopy(verificationResult.issuer, "issuer")}
                        className="btn btn-outline"
                        style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                        aria-label="Copy Issuer Address"
                      >
                        <Icon icon={copiedKey === "issuer" ? Check : Copy} size={12} color={copiedKey === "issuer" ? "primary" : "muted"} />
                        <span style={{ marginLeft: "4px" }}>{copiedKey === "issuer" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <strong className="mono" style={{ color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "6px", wordBreak: "break-all" }}>
                      <Icon icon={Building2} size={14} color="muted" /> {verificationResult.issuer}
                    </strong>
                  </div>

                  <div style={{ gridColumn: "span 2", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Nullifier Hash (Double-Claim Prevention)</span>
                      <button
                        onClick={() => handleCopy(verificationResult.nullifier, "nullifier")}
                        className="btn btn-outline"
                        style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                        aria-label="Copy Nullifier Hash"
                      >
                        <Icon icon={copiedKey === "nullifier" ? Check : Copy} size={12} color={copiedKey === "nullifier" ? "primary" : "muted"} />
                        <span style={{ marginLeft: "4px" }}>{copiedKey === "nullifier" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap", marginTop: "2px" }}>
                      <strong className="mono" style={{ color: "var(--primary)", fontSize: "0.82rem", wordBreak: "break-all" }}>
                        <Icon icon={Fingerprint} size={14} color="primary" /> {verificationResult.nullifier}
                      </strong>
                      <span className="badge badge-primary" style={{ flexShrink: 0 }}>
                        {nullifierStatus ? "Registered (Spent)" : "Unregistered"}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "18px", display: "flex", alignItems: "center", gap: "10px", color: "var(--text-muted)", fontSize: "0.82rem", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
                  <Icon icon={ShieldCheck} size={17} color="primary" />
                  <span>
                    Student identity, GPA transcripts, and academic records are mathematically unrevealed and never stored on-chain.
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ background: "var(--danger-bg)", border: "2px solid var(--danger)", borderRadius: "var(--radius-lg)", padding: "26px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "14px" }}>
                  <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "var(--danger)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon icon={CircleX} size={26} color="ink" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.25rem", color: "var(--danger)", fontWeight: "800" }}>
                      RECORD NOT FOUND / UNVERIFIED
                    </h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      No successful verification record exists on-chain for this Proof ID.
                    </p>
                  </div>
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", lineHeight: 1.5 }}>
                  Under the ChainProof protocol security model, any proof that fails Groth16 verification, or has never been confirmed on the smart contract, returns an empty unverified record.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
