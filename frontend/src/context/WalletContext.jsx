import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import deployedInfo from "../contracts/deployedAddresses.json";
import registryAbi from "../contracts/EligibilityRegistryAbi.json";

export const HARDHAT_ACCOUNTS = [
  {
    index: 0,
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    label: "Account #0 (Issuer / Deployer)",
    role: "Issuer",
    badge: "ISSUER_ROLE",
    description: "Contract deployer with ISSUER_ROLE. Can publish and revoke schemes."
  },
  {
    index: 1,
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    label: "Account #1 (Student STU001)",
    role: "Student",
    badge: "STU001 Eligible",
    description: "Aarav Sharma (CGPA 9.20, Dept 1, Fee Paid). Bound to demo credential STU001."
  },
  {
    index: 2,
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    privateKey: "0x5de4111afa1a4b94908f83103eb2f954108223c374c4722509618035850989b8",
    label: "Account #2 (Student STU002)",
    role: "Student",
    badge: "STU002 Eligible",
    description: "Diya Patel (CGPA 8.75, Dept 2, Fee Paid). Bound to demo credential STU002."
  }
];

const WalletContext = createContext();

const SUPPORTED_CHAINS = {
  31337: {
    chainId: "0x7a69",
    chainName: "Hardhat Localhost",
    rpcUrls: ["http://127.0.0.1:8545"],
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }
  },
  11155111: {
    chainId: "0xaa36a7",
    chainName: "Sepolia Testnet",
    rpcUrls: ["https://rpc.sepolia.org"],
    nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: ["https://sepolia.etherscan.io"]
  }
};

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [balance, setBalance] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [walletMode, setWalletMode] = useState(null);
  const [localAccountIndex, setLocalAccountIndex] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasWallet, setHasWallet] = useState(true);
  const [error, setError] = useState(null);

  const defaultRegistryAddress = deployedInfo.registry || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const [registryAddress, setRegistryAddress] = useState(defaultRegistryAddress);

  const fetchBalance = useCallback(async (addr, prov) => {
    if (!addr || !prov) {
      setBalance(null);
      return;
    }
    try {
      const bal = await prov.getBalance(addr);
      const formatted = parseFloat(ethers.formatEther(bal)).toFixed(4);
      setBalance(`${formatted} ETH`);
    } catch (e) {
      setBalance(null);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!window.ethereum) {
      setHasWallet(false);
      try {
        const fallback = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        setProvider(fallback);
        const roContract = new ethers.Contract(registryAddress, registryAbi, fallback);
        setContract(roContract);
      } catch (e) {
        console.warn("Could not connect to fallback RPC:", e);
      }
      return;
    }

    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    setProvider(browserProvider);

    browserProvider.getNetwork().then((net) => {
      setChainId(Number(net.chainId));
    });

    browserProvider.listAccounts().then((accounts) => {
      if (accounts.length > 0) {
        const activeAddr = accounts[0].address;
        setAccount(activeAddr);
        setWalletMode("metamask");
        browserProvider.getSigner().then((s) => {
          setSigner(s);
          setContract(new ethers.Contract(registryAddress, registryAbi, s));
          fetchBalance(activeAddr, browserProvider);
        });
      } else {
        setContract(new ethers.Contract(registryAddress, registryAbi, browserProvider));
      }
    });

    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        const newAddr = accounts[0];
        setAccount(newAddr);
        setWalletMode("metamask");
        setLocalAccountIndex(null);
        browserProvider.getSigner().then((s) => {
          setSigner(s);
          setContract(new ethers.Contract(registryAddress, registryAbi, s));
          fetchBalance(newAddr, browserProvider);
        });
      } else {
        setAccount(null);
        setSigner(null);
        setWalletMode(null);
        setBalance(null);
        setContract(new ethers.Contract(registryAddress, registryAbi, browserProvider));
      }
    };

    const handleChainChanged = (newChainId) => {
      setChainId(parseInt(newChainId, 16));
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [registryAddress, fetchBalance]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      selectLocalAccount(0);
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      const activeAddr = accounts[0];
      setAccount(activeAddr);
      setWalletMode("metamask");
      setLocalAccountIndex(null);
      const s = await browserProvider.getSigner();
      setSigner(s);
      const net = await browserProvider.getNetwork();
      setChainId(Number(net.chainId));
      setContract(new ethers.Contract(registryAddress, registryAbi, s));
      fetchBalance(activeAddr, browserProvider);
    } catch (err) {
      if (err.code === 4001 || err.action === "REJECTED") {
        setError("Wallet connection rejected by user.");
      } else {
        setError(err.message || "Failed to connect wallet.");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const switchAccountMetaMask = async () => {
    if (!window.ethereum) {
      setError("MetaMask not detected. Use local accounts below.");
      return;
    }
    setError(null);
    try {
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }]
      });
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      if (accounts && accounts.length > 0) {
        const activeAddr = accounts[0];
        setAccount(activeAddr);
        setWalletMode("metamask");
        setLocalAccountIndex(null);
        const s = await browserProvider.getSigner();
        setSigner(s);
        setContract(new ethers.Contract(registryAddress, registryAbi, s));
        fetchBalance(activeAddr, browserProvider);
      }
    } catch (err) {
      if (err.code === 4001 || err.action === "REJECTED") {
      } else {
        setError(err.message || "Failed to switch account in MetaMask.");
      }
    }
  };

  const selectLocalAccount = useCallback(async (index) => {
    const acc = HARDHAT_ACCOUNTS[index];
    if (!acc) return;
    setError(null);
    try {
      const localProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const localSigner = new ethers.Wallet(acc.privateKey, localProvider);
      setProvider(localProvider);
      setSigner(localSigner);
      setAccount(acc.address);
      setChainId(31337);
      setWalletMode("local");
      setLocalAccountIndex(index);
      setContract(new ethers.Contract(registryAddress, registryAbi, localSigner));
      fetchBalance(acc.address, localProvider);
    } catch (err) {
      setError("Failed to switch local account: " + err.message);
    }
  }, [registryAddress, fetchBalance]);

  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    setWalletMode(null);
    setLocalAccountIndex(null);
    setBalance(null);
    try {
      const fallbackProvider = provider || new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      setContract(new ethers.Contract(registryAddress, registryAbi, fallbackProvider));
    } catch (e) {}
  };

  const switchNetwork = async (targetChainId = 31337) => {
    if (!window.ethereum) return;
    const chainConfig = SUPPORTED_CHAINS[targetChainId];
    if (!chainConfig) return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainConfig.chainId }]
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [chainConfig]
          });
        } catch (addError) {
          setError("Failed to add network to MetaMask.");
        }
      } else {
        setError("Failed to switch network.");
      }
    }
  };

  const isSupportedNetwork = chainId === 31337 || chainId === 1337 || chainId === 11155111;

  return (
    <WalletContext.Provider
      value={{
        account,
        chainId,
        balance,
        provider,
        signer,
        contract,
        walletMode,
        localAccountIndex,
        registryAddress,
        setRegistryAddress,
        hasWallet,
        isConnecting,
        error,
        setError,
        connectWallet,
        switchAccountMetaMask,
        selectLocalAccount,
        disconnectWallet,
        switchNetwork,
        isSupportedNetwork,
        HARDHAT_ACCOUNTS
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
