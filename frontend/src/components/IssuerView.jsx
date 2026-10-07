import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import {
  Building2,
  Lock,
  Zap,
  Send,
  ScanSearch,
  Search,
  Ban,
  Info,
  CircleCheck,
  CircleX,
  Loader2,
  ShieldCheck
} from "lucide-react";
import Icon from "./Icon";

export default function IssuerView() {
  const { contract, account, signer, selectLocalAccount } = useWallet();

  const [scholarshipId, setScholarshipId] = useState("101");
  const [merkleRoot, setMerkleRoot] = useState("");
  const [minCgpa, setMinCgpa] = useState("8.00");
  const [requiredDeptId, setRequiredDeptId] = useState("1");
  const [requireFeePaid, setRequireFeePaid] = useState(true);
  const [maxBirthYear, setMaxBirthYear] = useState("2002");
  const [metadataURI, setMetadataURI] = useState("ipfs://QmChainProofScholarship2026");

  const [inspectId, setInspectId] = useState("101");
  const [inspectedScheme, setInspectedScheme] = useState(null);

  const [hasIssuerRole, setHasIssuerRole] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (!contract || !account) {
      setHasIssuerRole(false);
      setCheckingRole(false);
      return;
    }
    setCheckingRole(true);
    contract.ISSUER_ROLE()
      .then((role) => contract.hasRole(role, account))
      .then((hasRole) => setHasIssuerRole(hasRole))
      .catch((err) => {
        console.warn("Could not check ISSUER_ROLE:", err);
        setHasIssuerRole(false);
      })
      .finally(() => setCheckingRole(false));
  }, [contract, account]);

  useEffect(() => {
    fetch("/zk/merkle_root.json")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.merkleRootHex) {
          setMerkleRoot(data.merkleRootHex);
        }
      })
      .catch(() => {});
  }, []);

  const handleLoadOfficialRoot = async () => {
    try {
      const res = await fetch("/zk/merkle_root.json");
      const data = await res.json();
      setMerkleRoot(data.merkleRootHex);
      setStatusMessage("Loaded official Merkle root from merkle_root.json");
    } catch (e) {
      setErrorMessage("Could not load /zk/merkle_root.json");
    }
  };

  const handleCreateScheme = async (e) => {
    e.preventDefault();
    if (!contract || !signer) {
      setErrorMessage("Please connect a wallet with ISSUER_ROLE to create a scheme.");
      return;
    }
    setErrorMessage(null);
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      const id = BigInt(scholarshipId);
      const root = merkleRoot.startsWith("0x") ? merkleRoot : "0x" + BigInt(merkleRoot).toString(16).padStart(64, "0");
      const minCgpaScaled = BigInt(Math.round(parseFloat(minCgpa) * 100));
      const deptId = BigInt(requiredDeptId);
      const feePaid = requireFeePaid ? 1n : 0n;
      const birthYear = BigInt(maxBirthYear);

      setStatusMessage("Broadcasting transaction to EligibilityRegistry...");
      const tx = await contract.createScheme(
        id,
        root,
        minCgpaScaled,
        deptId,
        feePaid,
        birthYear,
        metadataURI
      );
      setStatusMessage(`Transaction submitted: ${tx.hash}. Waiting for confirmation...`);
      const receipt = await tx.wait();
      setStatusMessage(`Scheme #${scholarshipId} successfully created on-chain in Block #${receipt.blockNumber}!`);
      handleInspectScheme(scholarshipId);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.reason || err.message || "Failed to create scheme.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInspectScheme = async (idToInspect) => {
    if (!contract) return;
    try {
      const id = BigInt(idToInspect);
      const s = await contract.getScheme(id);
      if (s && s.exists) {
        setInspectedScheme({
          scholarshipId: idToInspect,
          issuer: s.issuer,
          merkleRoot: s.merkleRoot,
          minCgpaScaled: Number(s.minCgpaScaled),
          requiredDeptId: Number(s.requiredDeptId),
          requireFeePaid: Number(s.requireFeePaid) === 1,
          maxBirthYear: Number(s.maxBirthYear),
          active: s.active,
          exists: s.exists,
          metadataURI: s.metadataURI
        });
      } else {
        setInspectedScheme({ exists: false, scholarshipId: idToInspect });
      }
    } catch (err) {
      console.error(err);
      setInspectedScheme(null);
    }
  };

  const handleRevokeScheme = async () => {
    if (!contract || !signer || !inspectedScheme) return;
    setIsRevoking(true);
    setErrorMessage(null);
    try {
      const tx = await contract.revokeScheme(BigInt(inspectedScheme.scholarshipId));
      setStatusMessage(`Revoking scheme... Tx: ${tx.hash}`);
      await tx.wait();
      setStatusMessage(`Scheme #${inspectedScheme.scholarshipId} successfully revoked.`);
      handleInspectScheme(inspectedScheme.scholarshipId);
    } catch (err) {
      setErrorMessage(err.reason || err.message || "Failed to revoke scheme.");
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "28px", alignItems: "start" }}>
      <div className="card card-accent-top">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <h2 style={{ fontSize: "1.35rem", display: "inline-flex", alignItems: "center", gap: "10px" }}>
              <Icon icon={Building2} size={22} color="primary" /> Issuer Dashboard
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
              Publish eligibility requirements and commit the student Merkle root to the blockchain.
            </p>
          </div>

          <div>
            {checkingRole ? (
              <span className="badge badge-cyan">Checking Role...</span>
            ) : hasIssuerRole ? (
              <span className="badge badge-primary">
                <Icon icon={CircleCheck} size={13} color="primary" /> Issuer: Authorized
              </span>
            ) : (
              <span className="badge badge-danger">
                <Icon icon={CircleX} size={13} color="danger" /> Not an Issuer
              </span>
            )}
          </div>
        </div>

        {statusMessage && (
          <div style={{ background: "var(--success-bg)", border: "1px solid var(--success-border)", borderRadius: "var(--radius-md)", padding: "12px 16px", marginBottom: "20px", fontSize: "0.88rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "10px" }}>
            <Icon icon={CircleCheck} size={18} color="primary" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div style={{ background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "var(--radius-md)", padding: "12px 16px", marginBottom: "20px", fontSize: "0.88rem", color: "var(--danger)", display: "flex", alignItems: "center", gap: "10px" }}>
            <Icon icon={CircleX} size={18} color="danger" />
            <span>{errorMessage}</span>
          </div>
        )}

        {!hasIssuerRole ? (
          <div style={{ background: "var(--warning-bg)", border: "1px solid var(--warning-border)", borderRadius: "var(--radius-md)", padding: "20px", marginTop: "16px" }}>
            <h4 style={{ color: "var(--warning)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Icon icon={Lock} size={18} color="warning" /> Access Restricted to Issuers
            </h4>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: "14px" }}>
              {account ? (
                <>Your connected wallet (<span className="mono">{account.slice(0, 6)}...{account.slice(-4)}</span>) does not possess the <code>ISSUER_ROLE</code> on this smart contract. Only authorized university administrators can register new schemes or revoke existing ones.</>
              ) : (
                "Please connect an authorized wallet holding the ISSUER_ROLE to publish or modify scholarship schemes."
              )}
            </p>
            <button
              type="button"
              onClick={() => selectLocalAccount(0)}
              className="btn btn-primary"
              style={{ padding: "8px 16px", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              <Icon icon={Building2} size={16} color="ink" /> Switch to Account #0 (Issuer / Admin)
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateScheme}>
            <div style={{ marginBottom: "18px", paddingBottom: "16px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--primary)", marginBottom: "12px" }}>
                1. Scheme Identification & Commit
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Scholarship ID</label>
                  <input
                    type="number"
                    className="input-field"
                    value={scholarshipId}
                    onChange={(e) => setScholarshipId(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Metadata URI (IPFS / Hash)</label>
                  <input
                    type="text"
                    className="input-field mono"
                    value={metadataURI}
                    onChange={(e) => setMetadataURI(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Merkle Root (bytes32 hex)</label>
                  <button
                    type="button"
                    onClick={handleLoadOfficialRoot}
                    className="btn btn-outline"
                    style={{ padding: "4px 10px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <Icon icon={Zap} size={13} color="primary" /> Load from merkle_root.json
                  </button>
                </div>
                <input
                  type="text"
                  className="input-field mono"
                  value={merkleRoot}
                  onChange={(e) => setMerkleRoot(e.target.value)}
                  placeholder="0x..."
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--primary)", marginBottom: "12px" }}>
                2. Eligibility Rules & Thresholds
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Min CGPA Threshold</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    className="input-field"
                    value={minCgpa}
                    onChange={(e) => setMinCgpa(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Max Birth Year (Age Cutoff)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={maxBirthYear}
                    onChange={(e) => setMaxBirthYear(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Required Department</label>
                <select
                  className="input-field"
                  value={requiredDeptId}
                  onChange={(e) => setRequiredDeptId(e.target.value)}
                >
                  <option value="0">0 — Any Department (Wildcard)</option>
                  <option value="1">1 — Computer Science</option>
                  <option value="2">2 — Electrical Engineering</option>
                  <option value="3">3 — Mechanical Engineering</option>
                </select>
              </div>

              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "10px", margin: "16px 0" }}>
                <input
                  type="checkbox"
                  id="requireFeePaid"
                  checked={requireFeePaid}
                  onChange={(e) => setRequireFeePaid(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "var(--primary)", cursor: "pointer" }}
                />
                <label htmlFor="requireFeePaid" style={{ fontSize: "0.88rem", cursor: "pointer", color: "var(--text)" }}>
                  Require Tuition Fee to be Fully Paid (<span className="mono" style={{ color: "var(--primary)" }}>feePaid == 1</span>)
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ width: "100%", padding: "14px", marginTop: "8px" }}
            >
              {isSubmitting ? (
                <>
                  <Icon icon={Loader2} size={16} spin color="ink" /> Publishing on Blockchain...
                </>
              ) : (
                <>
                  <Icon icon={Send} size={16} color="ink" /> Publish Scholarship Scheme On-Chain
                </>
              )}
            </button>
          </form>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div className="card">
          <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon icon={ScanSearch} size={18} color="primary" /> Scheme Inspector
          </h3>
          
          <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
            <input
              type="number"
              className="input-field"
              placeholder="Scholarship ID..."
              value={inspectId}
              onChange={(e) => setInspectId(e.target.value)}
            />
            <button
              onClick={() => handleInspectScheme(inspectId)}
              className="btn btn-outline"
              style={{ whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Icon icon={Search} size={14} /> Fetch
            </button>
          </div>

          {inspectedScheme ? (
            inspectedScheme.exists ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "var(--surface-2)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: "700", fontSize: "1.05rem" }}>Scheme #{inspectedScheme.scholarshipId}</span>
                  <span className={`badge ${inspectedScheme.active ? "badge-primary" : "badge-danger"}`}>
                    {inspectedScheme.active ? "Active" : "Revoked"}
                  </span>
                </div>

                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div><strong>Issuer:</strong> <span className="mono">{inspectedScheme.issuer.slice(0, 8)}...{inspectedScheme.issuer.slice(-6)}</span></div>
                  <div><strong>Min CGPA:</strong> {(inspectedScheme.minCgpaScaled / 100).toFixed(2)}</div>
                  <div><strong>Required Dept:</strong> {inspectedScheme.requiredDeptId === 0 ? "Any (Wildcard)" : `Dept ${inspectedScheme.requiredDeptId}`}</div>
                  <div><strong>Fee Required:</strong> {inspectedScheme.requireFeePaid ? "Must be Paid" : "Optional"}</div>
                  <div><strong>Max Birth Year:</strong> {inspectedScheme.maxBirthYear}</div>
                  <div style={{ marginTop: "4px", wordBreak: "break-all" }}>
                    <strong>Merkle Root:</strong><br />
                    <span className="mono" style={{ fontSize: "0.75rem", color: "var(--secondary)" }}>{inspectedScheme.merkleRoot}</span>
                  </div>
                </div>

                {inspectedScheme.active && hasIssuerRole && (
                  <button
                    onClick={handleRevokeScheme}
                    disabled={isRevoking}
                    className="btn btn-danger"
                    style={{ marginTop: "10px", width: "100%", padding: "9px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                  >
                    {isRevoking ? (
                      <>
                        <Icon icon={Loader2} size={15} spin color="danger" /> Revoking...
                      </>
                    ) : (
                      <>
                        <Icon icon={Ban} size={15} color="danger" /> Revoke Scheme
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>No scheme found on-chain with ID #{inspectId}.</p>
            )
          ) : (
            <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>Enter a scholarship ID to inspect current on-chain state.</p>
          )}
        </div>

        <div className="card" style={{ background: "var(--surface-2)" }}>
          <h4 style={{ color: "var(--primary)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.92rem" }}>
            <Icon icon={ShieldCheck} size={17} color="primary" /> Cryptographic Commitment
          </h4>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            The smart contract only stores the cryptographic <strong>Merkle root</strong>. Individual student identities, marks, and personal credentials never touch the blockchain during scheme creation.
          </p>
        </div>
      </div>
    </div>
  );
}
