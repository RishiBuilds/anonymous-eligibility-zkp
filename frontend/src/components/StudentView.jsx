import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import {
  GraduationCap,
  CircleCheck,
  CircleX,
  Upload,
  Zap,
  Send,
  ScanSearch,
  Lock,
  ShieldCheck,
  Loader2,
  Copy,
  Check,
  ClipboardList,
  Eye,
  EyeOff,
  FileJson,
  X,
  Flame,
  Fingerprint
} from "lucide-react";
import Icon from "./Icon";

export default function StudentView({ onNavigateToVerifier }) {
  const { contract, account, signer, walletMode, selectLocalAccount, HARDHAT_ACCOUNTS } = useWallet();

  const [credential, setCredential] = useState(null);
  const [credentialFileName, setCredentialFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [scholarshipId, setScholarshipId] = useState("101");
  const [scheme, setScheme] = useState(null);
  const [loadingScheme, setLoadingScheme] = useState(false);

  const [provingStatus, setProvingStatus] = useState("IDLE"); 
  const [provingStep, setProvingStep] = useState(0);
  const [provingMessage, setProvingMessage] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [generatedProof, setGeneratedProof] = useState(null);
  const [calldata, setCalldata] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const workerRef = useRef(null);
  const timerRef = useRef(null);

  const showToast = (msg, type = "success") => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCopy = (text, key) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  useEffect(() => {
    if (provingStatus === "PROVING") {
      setElapsedTime(0);
      const start = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedTime(((Date.now() - start) / 1000).toFixed(1));
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [provingStatus]);

  useEffect(() => {
    workerRef.current = new Worker(new URL("../zkWorker.js", import.meta.url), { type: "module" });

    workerRef.current.onmessage = (e) => {
      const { status, step, message, proof, publicSignals, calldata, error } = e.data;
      if (status === "PROGRESS") {
        setProvingStep(step);
        setProvingMessage(message);
      } else if (status === "SUCCESS") {
        setProvingStatus("PROVEN");
        setGeneratedProof({ proof, publicSignals });
        setCalldata(calldata);
        setProvingMessage("Groth16 proof & calldata generated successfully!");
        showToast("Zero-knowledge proof synthesized in browser!", "success");
      } else if (status === "ERROR") {
        setProvingStatus("ERROR");
        const msg = error || "";
        if (msg.includes("Assert Failed")) {
          setErrorMessage("Cryptographic constraint failed: The credential attributes or Merkle proof do not satisfy the scheme rules (e.g. CGPA below minimum, fee unpaid, birth year cutoff exceeded, or Merkle path invalid).");
        } else {
          setErrorMessage(msg);
        }
        setProvingMessage("Proof synthesis failed.");
        showToast("Proof generation failed. Check criteria.", "danger");
      }
    };

    workerRef.current.onerror = (err) => {
      console.error("Worker unhandled error:", err);
      setProvingStatus("ERROR");
      setErrorMessage(err.message || "Web Worker error occurred.");
    };

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  useEffect(() => {
    if (!contract || !scholarshipId) return;
    setLoadingScheme(true);
    contract
      .getScheme(BigInt(scholarshipId))
      .then((s) => {
        if (s && s.exists) {
          setScheme({
            scholarshipId,
            merkleRoot: s.merkleRoot,
            minCgpaScaled: Number(s.minCgpaScaled),
            requiredDeptId: Number(s.requiredDeptId),
            requireFeePaid: Number(s.requireFeePaid),
            maxBirthYear: Number(s.maxBirthYear),
            active: s.active,
            exists: s.exists
          });
        } else {
          setScheme(null);
        }
      })
      .catch(() => setScheme(null))
      .finally(() => setLoadingScheme(false));
  }, [contract, scholarshipId]);

  const processCredentialFile = (file) => {
    if (!file) return;
    setCredentialFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        setCredential(parsed);
        setErrorMessage(null);
        setGeneratedProof(null);
        setCalldata(null);
        setProvingStatus("IDLE");
        showToast(`Loaded ${parsed.studentId} (${parsed.name || "Student"})`, "success");
      } catch (err) {
        setErrorMessage("Invalid JSON credential file.");
        showToast("Invalid JSON credential file.", "danger");
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    processCredentialFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processCredentialFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveCredential = () => {
    setCredential(null);
    setCredentialFileName("");
    setGeneratedProof(null);
    setCalldata(null);
    setProvingStatus("IDLE");
  };

  const [provenRecipient, setProvenRecipient] = useState(null);

  const handleGenerateProof = async () => {
    if (!credential || !scheme) return;

    let currentAccount = account;
    if (walletMode === "metamask" && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts && accounts.length > 0) {
          currentAccount = accounts[0];
        }
      } catch (e) {
        console.warn("Could not query eth_accounts:", e);
      }
    }

    if (!currentAccount) {
      setErrorMessage("No wallet connected: Please connect a wallet before generating a proof. The proof mathematically binds to your recipient address.");
      return;
    }

    setProvenRecipient(currentAccount);
    setErrorMessage(null);
    setSubmissionResult(null);
    setProvingStatus("PROVING");
    setProvingStep(1);
    setProvingMessage("Calculating Poseidon nullifier & preparing witness...");

    try {
      const recipientBigInt = BigInt(currentAccount);

      const circuitInput = {
        studentSecret: credential.studentSecret,
        cgpaScaled: credential.attributes.cgpaScaled,
        deptId: credential.attributes.deptId,
        birthYear: credential.attributes.birthYear,
        feePaid: credential.attributes.feePaid,
        pathElements: credential.pathElements,
        pathIndices: credential.pathIndices,
        merkleRoot: scheme.merkleRoot,
        scholarshipId: scholarshipId.toString(),
        minCgpaScaled: scheme.minCgpaScaled.toString(),
        requiredDeptId: scheme.requiredDeptId.toString(),
        requireFeePaid: scheme.requireFeePaid.toString(),
        maxBirthYear: scheme.maxBirthYear.toString(),
        recipient: recipientBigInt.toString()
      };

      workerRef.current.postMessage({
        type: "GENERATE_PROOF",
        circuitInput,
        wasmUrl: "/zk/eligibility.wasm",
        zkeyUrl: "/zk/eligibility.zkey"
      });
    } catch (err) {
      setProvingStatus("ERROR");
      setErrorMessage(err.message || "Failed to initiate proof generation.");
    }
  };

  const handleSubmitProof = async () => {
    if (!contract || !signer || !calldata) return;

    let currentAccount = account;
    if (walletMode === "metamask" && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts && accounts.length > 0) {
          currentAccount = accounts[0];
        }
      } catch (e) {}
    }

    if (provenRecipient && currentAccount && currentAccount.toLowerCase() !== provenRecipient.toLowerCase()) {
      setGeneratedProof(null);
      setCalldata(null);
      setProvingStatus("IDLE");
      setProvenRecipient(null);
      setErrorMessage(
        `Wallet account changed from ${provenRecipient} to ${currentAccount} after proof generation! Proof is cryptographically bound to the previous address. Please re-generate proof.`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    showToast("Submitting proof transaction to smart contract...", "info");

    try {
      const { pA, pB, pC, pubSignals } = calldata;

      const tx = await contract.verifyAndRecord(pA, pB, pC, pubSignals);
      const receipt = await tx.wait();

      const filter = contract.filters.EligibilityVerified();
      const events = await contract.queryFilter(filter, receipt.blockNumber, receipt.blockNumber);
      const proofId = events.length > 0 ? events[0].args.proofId : null;

      setSubmissionResult({
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        proofId: proofId || "N/A"
      });
      showToast("Eligibility verified on-chain!", "success");
    } catch (err) {
      console.error("Submission error:", err);
      const msg = err.message || "";
      const errorData = err.data || (err.info && err.info.error && err.info.error.data) || "";
      let errorName = "";
      try {
        if (contract && errorData) {
          const parsed = contract.interface.parseError(errorData);
          if (parsed) errorName = parsed.name;
        }
      } catch (e) {}

      if (errorName === "NullifierAlreadyUsed" || msg.includes("NullifierAlreadyUsed") || errorData.includes("0xcad2ae02") || msg.includes("0xcad2ae02")) {
        setErrorMessage("Double claim prevented: You have already submitted a claim for this scholarship.");
      } else if (errorName === "RecipientMismatch" || msg.includes("RecipientMismatch") || errorData.includes("0xc0ee95bb") || msg.includes("0xc0ee95bb")) {
        setErrorMessage("Recipient mismatch: Current wallet address does not match the recipient address bound into the proof.");
      } else if (errorName === "SchemeInactive" || msg.includes("SchemeInactive") || errorData.includes("0x9217c61c") || msg.includes("0x9217c61c")) {
        setErrorMessage("Scheme inactive: This scholarship scheme is currently revoked or deactivated. No claims are accepted.");
      } else if (errorName === "SchemeNotFound" || msg.includes("SchemeNotFound") || errorData.includes("0xd5782aaf") || msg.includes("0xd5782aaf")) {
        setErrorMessage("Scheme not found: This scholarship ID does not exist on-chain.");
      } else if (errorName === "SchemeParamsMismatch" || msg.includes("SchemeParamsMismatch") || errorData.includes("0x1e91fbdc") || msg.includes("0x1e91fbdc")) {
        setErrorMessage("Scheme criteria mismatch: The proof was constructed with parameters that do not match the on-chain scheme rules.");
      } else if (errorName === "InvalidProof" || msg.includes("InvalidProof") || errorData.includes("0x09bde339") || msg.includes("0x09bde339")) {
        setErrorMessage("Invalid proof: The zero-knowledge cryptographic proof points failed on-chain Groth16 verification.");
      } else if (err.action === "REJECTED" || (err.info && err.info.error && err.info.error.code === 4001)) {
        setErrorMessage("Transaction was cancelled in your wallet.");
      } else {
        setErrorMessage(err.reason || err.message || "Transaction failed.");
      }
      showToast("Transaction failed.", "danger");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCgpaPassed = credential && scheme && Number(credential.attributes.cgpaScaled) >= scheme.minCgpaScaled;
  const isDeptPassed = credential && scheme && (scheme.requiredDeptId === 0 || Number(credential.attributes.deptId) === scheme.requiredDeptId);
  const isFeePassed = credential && scheme && (!scheme.requireFeePaid || Number(credential.attributes.feePaid) === 1);
  const isAgePassed = credential && scheme && Number(credential.attributes.birthYear) <= scheme.maxBirthYear;
  const isAllPassed = isCgpaPassed && isDeptPassed && isFeePassed && isAgePassed;

  const currentStep = submissionResult ? 4 : generatedProof ? 3 : credential ? (isAllPassed ? 3 : 2) : 1;

  return (
    <div>
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            background: toastMessage.type === "danger" ? "var(--danger-bg)" : "var(--surface)",
            border: `1px solid ${toastMessage.type === "danger" ? "var(--danger-border)" : "var(--border-active)"}`,
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            color: toastMessage.type === "danger" ? "var(--danger)" : "var(--primary)",
            padding: "12px 20px",
            borderRadius: "var(--radius-md)",
            fontSize: "0.9rem",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}
        >
          <Icon icon={toastMessage.type === "danger" ? CircleX : CircleCheck} size={18} color={toastMessage.type === "danger" ? "danger" : "primary"} />
          <span>{toastMessage.msg}</span>
        </div>
      )}

      <div className="stepper-nav">
        <div className={`stepper-step ${currentStep > 1 ? "completed" : currentStep === 1 ? "active" : ""}`}>
          <Icon icon={currentStep > 1 ? Check : FileJson} size={15} color={currentStep === 1 ? "ink" : "current"} />
          <span>1. Load Credential</span>
        </div>
        <div className={`stepper-step ${currentStep > 2 ? "completed" : currentStep === 2 ? "active" : ""}`}>
          <Icon icon={currentStep > 2 ? Check : ClipboardList} size={15} color={currentStep === 2 ? "ink" : "current"} />
          <span>2. Check Eligibility</span>
        </div>
        <div className={`stepper-step ${currentStep > 3 ? "completed" : currentStep === 3 ? "active" : ""}`}>
          <Icon icon={currentStep > 3 ? Check : Zap} size={15} color={currentStep === 3 ? "ink" : "current"} />
          <span>3. Generate ZK Proof</span>
        </div>
        <div className={`stepper-step ${currentStep === 4 ? "completed active" : ""}`}>
          <Icon icon={currentStep === 4 ? Check : Send} size={15} color={currentStep === 4 ? "ink" : "current"} />
          <span>4. Submit On-Chain</span>
        </div>
      </div>

      <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: "28px", alignItems: "start" }}>
        <div className="card card-accent-top">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h2 style={{ fontSize: "1.35rem", display: "inline-flex", alignItems: "center", gap: "10px" }}>
                <Icon icon={GraduationCap} size={22} color="primary" /> Student Privacy Portal
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
                Generate client-side zero-knowledge proofs to claim scholarships without revealing your identity.
              </p>
            </div>
            <span className="badge badge-client-side">Client-Side Only</span>
          </div>

          {errorMessage && (
            <div style={{ background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "var(--radius-md)", padding: "12px 16px", marginBottom: "20px", fontSize: "0.88rem", color: "var(--danger)", display: "flex", alignItems: "center", gap: "10px" }}>
              <Icon icon={CircleX} size={18} color="danger" />
              <span>{errorMessage}</span>
            </div>
          )}

          {account && HARDHAT_ACCOUNTS && account.toLowerCase() === HARDHAT_ACCOUNTS[0].address.toLowerCase() && (
            <div style={{ background: "rgba(198, 255, 61, 0.06)", border: "1px solid rgba(198, 255, 61, 0.25)", borderRadius: "var(--radius-md)", padding: "12px 16px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Connected as <strong style={{ color: "var(--text)" }}>Issuer (Account #0)</strong>. Want to claim demo credential STU001 as student?
              </div>
              <button
                type="button"
                onClick={() => selectLocalAccount(1)}
                className="btn btn-outline"
                style={{ fontSize: "0.8rem", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Icon icon={GraduationCap} size={14} color="secondary" /> Switch to Student #1 (STU001)
              </button>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label className="form-label" style={{ marginBottom: 0 }}>1. Load Credential File (.credential.json)</label>
              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Stays strictly in browser memory</span>
            </div>

            {!credential ? (
              <div
                className={`drop-zone ${isDragging ? "drag-active" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById("credFileInput").click()}
              >
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                  id="credFileInput"
                />
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(198, 255, 61, 0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <Icon icon={Upload} size={22} color="primary" />
                </div>
                <div style={{ fontWeight: "600", fontSize: "0.95rem", marginBottom: "4px" }}>
                  Drag & Drop credential JSON here, or <span style={{ color: "var(--primary)", textDecoration: "underline" }}>browse</span>
                </div>
                <p style={{ color: "var(--text-dim)", fontSize: "0.78rem" }}>
                  Supports cryptographic credential JSON files issued by the college.
                </p>
              </div>
            ) : (
              <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--success-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon icon={FileJson} size={18} color="primary" />
                  </div>
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>{credential.studentId} — {credential.name || "Anonymous"}</span>
                      <span className="badge badge-primary">Valid Leaf</span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      {credentialFileName || `${credential.studentId}.credential.json`} • CGPA: {(Number(credential.attributes.cgpaScaled) / 100).toFixed(2)} • Dept: {credential.attributes.deptId}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleRemoveCredential}
                  title="Remove credential"
                  aria-label="Remove credential"
                  className="btn btn-outline"
                  style={{ padding: "6px", border: "none", borderRadius: "50%", width: "30px", height: "30px" }}
                >
                  <Icon icon={X} size={16} color="muted" />
                </button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">2. Target Scholarship Scheme ID</label>
            <input
              type="number"
              className="input-field"
              value={scholarshipId}
              onChange={(e) => setScholarshipId(e.target.value)}
              placeholder="e.g. 101"
            />
          </div>

          <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--border)" }}>
            <button
              onClick={handleGenerateProof}
              disabled={!credential || !scheme || provingStatus === "PROVING"}
              className="btn btn-primary"
              style={{ width: "100%", padding: "14px", fontSize: "1rem" }}
            >
              {provingStatus === "PROVING" ? (
                <>
                  <Icon icon={Loader2} size={18} spin color="ink" /> Generating ZK Proof in Browser...
                </>
              ) : (
                <>
                  <Icon icon={Zap} size={18} color="ink" /> Generate Zero-Knowledge Proof (Groth16)
                </>
              )}
            </button>

            {provingStatus === "PROVING" && (
              <div style={{ marginTop: "16px", background: "var(--surface-2)", border: "1px solid rgba(198, 255, 61, 0.3)", borderRadius: "var(--radius-md)", padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", marginBottom: "8px" }}>
                  <span style={{ color: "var(--primary)", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Icon icon={Loader2} size={14} spin color="primary" /> Synthesizing Groth16 Proof (Web Worker)
                  </span>
                  <span className="mono" style={{ color: "var(--secondary)", fontWeight: "700" }}>
                    Elapsed: {elapsedTime}s
                  </span>
                </div>

                <div style={{ width: "100%", height: "6px", background: "rgba(0,0,0,0.4)", borderRadius: "3px", overflow: "hidden", marginBottom: "8px" }}>
                  <div
                    style={{
                      height: "100%",
                      width: provingStep === 1 ? "35%" : provingStep === 2 ? "70%" : "95%",
                      background: "linear-gradient(90deg, #C6FF3D 0%, #22E1FF 100%)",
                      transition: "width 0.4s ease"
                    }}
                  ></div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  <span>{provingMessage}</span>
                  <span style={{ color: "var(--text-dim)" }}>Running in your browser — zero server transmission</span>
                </div>
              </div>
            )}

            {provingStatus === "PROVEN" && !submissionResult && (
              <div style={{ marginTop: "16px", background: "var(--surface-2)", border: "1px solid var(--border-active)", borderRadius: "var(--radius-md)", padding: "18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary)", fontWeight: "700", marginBottom: "8px" }}>
                  <Icon icon={CircleCheck} size={18} color="primary" />
                  <span>Groth16 Proof Generated & Ready!</span>
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "14px", lineHeight: "1.5" }}>
                  Your zero-knowledge proof mathematically binds your recipient address (<span className="mono" style={{ color: "var(--primary)" }}>{account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "None"}</span>) to the scholarship nullifier without disclosing your identity or CGPA.
                </p>

                <button
                  onClick={handleSubmitProof}
                  disabled={isSubmitting || !account}
                  className="btn btn-primary"
                  style={{ width: "100%", padding: "13px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                >
                  {isSubmitting ? (
                    <>
                      <Icon icon={Loader2} size={16} spin color="ink" /> Submitting Transaction to Blockchain...
                    </>
                  ) : (
                    <>
                      <Icon icon={Send} size={16} color="ink" /> Submit Proof to Smart Contract
                    </>
                  )}
                </button>
              </div>
            )}

            {submissionResult && (
              <div style={{ marginTop: "20px", background: "var(--surface-2)", border: "1px solid var(--border-active)", borderRadius: "var(--radius-md)", padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--success-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon icon={CircleCheck} size={22} color="primary" />
                  </div>
                  <div>
                    <h4 style={{ color: "var(--text)", fontSize: "1.05rem", fontWeight: "700" }}>
                      Eligibility Verified On-Chain!
                    </h4>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Recorded permanently on EligibilityRegistry
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.85rem" }}>
                  <div style={{ background: "rgba(0, 0, 0, 0.4)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", fontWeight: "600" }}>
                        Unique Proof Identifier (proofId)
                      </span>
                      <button
                        onClick={() => handleCopy(submissionResult.proofId, "proofId")}
                        className="btn btn-outline"
                        style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                        aria-label="Copy Proof ID"
                      >
                        <Icon icon={copiedKey === "proofId" ? Check : Copy} size={13} color={copiedKey === "proofId" ? "primary" : "muted"} />
                        <span style={{ marginLeft: "4px" }}>{copiedKey === "proofId" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <div className="mono" style={{ color: "var(--secondary)", wordBreak: "break-all", fontSize: "0.85rem" }}>
                      {submissionResult.proofId}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div style={{ background: "rgba(0, 0, 0, 0.25)", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", display: "block" }}>Block Number</span>
                      <span className="mono" style={{ fontWeight: "600" }}>#{submissionResult.blockNumber}</span>
                    </div>
                    <div style={{ background: "rgba(0, 0, 0, 0.25)", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", display: "block" }}>Gas Used</span>
                      <span className="mono" style={{ fontWeight: "600" }}>{submissionResult.gasUsed}</span>
                    </div>
                  </div>

                  <div style={{ background: "rgba(0, 0, 0, 0.25)", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", display: "block" }}>Transaction Hash</span>
                    <span className="mono" style={{ fontSize: "0.8rem", color: "var(--text-muted)", wordBreak: "break-all" }}>
                      {submissionResult.txHash}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateToVerifier(submissionResult.proofId)}
                  className="btn btn-secondary"
                  style={{ marginTop: "16px", width: "100%", padding: "11px", fontSize: "0.88rem", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                >
                  <Icon icon={ScanSearch} size={16} color="ink" /> View Proof Audit in Verifier Tab →
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="card">
            <h3 style={{ fontSize: "1.1rem", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Icon icon={ClipboardList} size={18} color="primary" /> Scheme #{scholarshipId} Rules
            </h3>
            {loadingScheme ? (
              <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>Loading on-chain scheme #{scholarshipId}...</p>
            ) : scheme && scheme.exists ? (
              <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ color: "var(--text-muted)" }}>Scheme Status</span>
                  <span className={`badge ${scheme.active ? "badge-primary" : "badge-danger"}`}>
                    {scheme.active ? "Active" : "Revoked"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Min CGPA Required</span>
                  <strong className="mono">{(scheme.minCgpaScaled / 100).toFixed(2)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Department</span>
                  <strong>{scheme.requiredDeptId === 0 ? "Any Department" : `Dept ID ${scheme.requiredDeptId}`}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Fee Payment</span>
                  <strong>{scheme.requireFeePaid ? "Must be Paid" : "Optional"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Max Birth Year</span>
                  <strong className="mono">Born &le; {scheme.maxBirthYear}</strong>
                </div>
              </div>
            ) : (
              <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
                Scheme #{scholarshipId} not found on-chain. Please ensure the issuer has published it.
              </p>
            )}
          </div>

          {credential && scheme && scheme.exists && (
            <div className="card">
              <h4 style={{ fontSize: "0.95rem", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Icon icon={Lock} size={16} color="secondary" /> Client-Side Eligibility Pre-Check
              </h4>
              <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>CGPA (&ge; {(scheme.minCgpaScaled / 100).toFixed(2)})</span>
                  {isCgpaPassed ? (
                    <span className="badge badge-primary">
                      <Icon icon={CircleCheck} size={13} color="primary" /> Passed
                    </span>
                  ) : (
                    <span className="badge badge-danger">
                      <Icon icon={CircleX} size={13} color="danger" /> Below Min
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Department Match</span>
                  {isDeptPassed ? (
                    <span className="badge badge-primary">
                      <Icon icon={CircleCheck} size={13} color="primary" /> Passed
                    </span>
                  ) : (
                    <span className="badge badge-danger">
                      <Icon icon={CircleX} size={13} color="danger" /> Mismatch
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Tuition Fee Paid</span>
                  {isFeePassed ? (
                    <span className="badge badge-primary">
                      <Icon icon={CircleCheck} size={13} color="primary" /> Passed
                    </span>
                  ) : (
                    <span className="badge badge-danger">
                      <Icon icon={CircleX} size={13} color="danger" /> Unpaid
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Age Requirement</span>
                  {isAgePassed ? (
                    <span className="badge badge-primary">
                      <Icon icon={CircleCheck} size={13} color="primary" /> Passed
                    </span>
                  ) : (
                    <span className="badge badge-danger">
                      <Icon icon={CircleX} size={13} color="danger" /> Too Late
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="card" style={{ background: "var(--surface-2)" }}>
            <h4 style={{ fontSize: "0.95rem", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Icon icon={ShieldCheck} size={17} color="primary" /> Public vs Private Data
            </h4>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.82rem" }}>
              <div style={{ borderLeft: "2px solid var(--secondary)", paddingLeft: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--secondary)", fontWeight: "700", marginBottom: "4px" }}>
                  <Icon icon={Eye} size={14} color="secondary" />
                  <span>WHAT THE BLOCKCHAIN SEES (PUBLIC)</span>
                </div>
                <ul style={{ listStyle: "none", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "3px" }}>
                  <li>• Groth16 Proof Points (G1, G2 curves)</li>
                  <li>• Nullifier Hash <span className="mono">H(secret, schemeId)</span></li>
                  <li>• Recipient Wallet Address (<span className="mono">msg.sender</span>)</li>
                  <li>• Scheme ID & Merkle Root Reference</li>
                  <li>• Verification Timestamp & Valid Status</li>
                </ul>
              </div>

              <div style={{ borderLeft: "2px solid var(--primary)", paddingLeft: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--primary)", fontWeight: "700", marginBottom: "4px" }}>
                  <Icon icon={EyeOff} size={14} color="primary" />
                  <span>WHAT STAYS 100% PRIVATE (HIDDEN)</span>
                </div>
                <ul style={{ listStyle: "none", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "3px" }}>
                  <li>• Student Name & Roll Number</li>
                  <li>• Exact CGPA & Marks Transcripts</li>
                  <li>• Exact Date of Birth / Age</li>
                  <li>• College Secret Salt & Merkle Path</li>
                  <li>• Student Private Witness Inputs</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
