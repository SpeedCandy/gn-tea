import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

export default function Home() {
    const [status, setStatus] = useState('');
    const [dailyCount, setDailyCount] = useState(0);
    const [totalUser, setTotalUser] = useState(0);
    const [totalTx, setTotalTx] = useState(0);
    const [fallingElements, setFallingElements] = useState([]);

    // === DUAL RPC ===
    const rpcList = [
        "https://tea-sepolia.g.alchemy.com/v2/bsayB3hJ3hij6-t5YUUQBL5jDV-o5h2f",
        "https://tea-sepolia.g.alchemy.com/v2/Wa-bUwSDb2nujeYWyIZ9eHK3XXsxiM8j"
    ];

    const contractAddress = "0xEdF7dE119Fe7c0d2c0252a2e47E0c7FBc3FE1D4a";

    const abi = [
        "function gn() external",
        "event GNed(address indexed user, uint256 timestamp)"
    ];

    // === GET PROVIDER ===
    async function getWorkingProvider() {
        for (const rpc of rpcList) {
            try {
                const provider = new ethers.JsonRpcProvider(rpc);
                await provider.getBlockNumber(); // simple ping
                console.log(`✅ Connected to: ${rpc}`);
                return provider;
            } catch (err) {
                console.log(`❌ RPC Failed: ${rpc}`);
            }
        }
        throw new Error("❌ All RPC failed");
    }

    // === FETCH EVENTS ===
    useEffect(() => {
        async function fetchEvents() {
            const provider = await getWorkingProvider();
            const contract = new ethers.Contract(contractAddress, abi, provider);

            const latestBlock = await provider.getBlockNumber();
            const fromBlock = latestBlock - 50000 > 0 ? latestBlock - 50000 : 0;

            const logs = await contract.queryFilter("GNed", fromBlock, latestBlock);
            const userSet = new Set();
            const dailySet = new Set();
            const today = new Date().toDateString();

            logs.forEach(log => {
                const user = log.args.user.toLowerCase();
                const time = new Date(Number(log.args.timestamp) * 1000).toDateString();
                userSet.add(user);
                if (time === today) {
                    dailySet.add(user);
                }
            });

            setTotalUser(userSet.size);
            setDailyCount(dailySet.size);
            setTotalTx(logs.length);
        }

        fetchEvents();
        const interval = setInterval(fetchEvents, 10000);
        return () => clearInterval(interval);
    }, []);

    // === CREATE FALLING ELEMENTS ===
    function createFallingElements() {
        const newElements = [];

        // Create 5 moons
        for (let i = 0; i < 5; i++) {
            const id = `moon-${Date.now()}-${i}`;
            const duration = 1.5 + Math.random() * 1.5; // Between 1.5s and 3s
            newElements.push({ id, type: 'moon', x: Math.random() * 100, duration });
        }

        // Create 10 stars
        for (let i = 0; i < 10; i++) {
            const id = `star-${Date.now()}-${i}`;
            const duration = 1.5 + Math.random() * 1.5; // Between 1.5s and 3s
            newElements.push({ id, type: 'star', x: Math.random() * 100, duration });
        }

        setFallingElements(prev => [...prev, ...newElements]);
    }

    // === REMOVE FALLING ELEMENT ===
    function removeFallingElement(id) {
        setFallingElements(prev => prev.filter(el => el.id !== id));
    }

    // === TX tetap pake wallet signer ===
    async function sendGN() {
        createFallingElements(); // Trigger animation immediately on button click

        if (!window.ethereum) return setStatus('⚠️ Wallet not found');

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddress, abi, signer);

        try {
            const tx = await contract.gn();
            setStatus(`✅ TX Sent! Hash: ${tx.hash}`);

            try {
                await tx.wait();
                setStatus(`✅ Confirmed! TX Hash: https://sepolia.tea.xyz/tx/${tx.hash}`);
            } catch (waitErr) {
                setStatus(`⚠️ TX sent but receipt failed. Check: https://sepolia.tea.xyz/tx/${tx.hash}`);
            }

        } catch (err) {
            setStatus(`❌ Error: ${err.message}`);
        }
    }

    // === FALLING ELEMENT COMPONENT ===
    function FallingElement({ id, type, x, duration, onAnimationEnd }) {
        const symbol = type === 'moon' ? '🌙' : '⭐';
        const fontSize = type === 'moon' ? '32px' : '16px';

        const style = {
            position: 'fixed',
            top: 0,
            left: `${x}%`,
            fontSize,
            animationName: 'fall',
            animationDuration: `${duration}s`,
            animationTimingFunction: 'linear',
            animationIterationCount: 1, // Animasyonun sadece bir kez çalışmasını sağlar
            zIndex: 0, // Yazıların arkasında ama arka planın önünde
        };

        return (
            <div style={style} onAnimationEnd={() => onAnimationEnd(id)}>
                {symbol}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white space-y-4 p-4" style={{ position: 'relative', zIndex: 1 }}>
            <h1 className="text-4xl font-bold">gn tea sepolia</h1>
            <button
                onClick={sendGN}
                className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-6 rounded-full transition-all"
            >
                gn
            </button>

            {/* === Stats === */}
            <div className="text-sm mt-4 space-y-1 text-center">
                <p>💎 Total TX (onchain): {totalTx}</p>
                <p>✅ Total Unique Users Today: {dailyCount}</p>
                <p>✅ Total Unique Users All Time: {totalUser}</p>
                <p>Contract: <a href={`https://sepolia.tea.xyz/address/${contractAddress}`} target="_blank" className="underline text-pink-400">{contractAddress}</a></p>
                <p>Chain ID: 10218 (Tea Sepolia)</p>
            </div>

            {/* === Footer === */}
            <div className="text-xs mt-8 opacity-70 text-center transition-all hover:opacity-100 hover:scale-105">
                Built by <a href="https://github.com/H15S" target="_blank" className="underline hover:text-pink-400">H15S</a>
            </div>

            <div className="text-xs mt-8 opacity-70 text-center transition-all hover:opacity-100 hover:scale-105">
                <a href="https://github.com/SpeedCandy" target="_blank" className="underline hover:text-red-400">Thank you for making it open source!</a>
            </div>

            <p>{status}</p>

            {/* === Render Falling Elements === */}
            {fallingElements.map(el => (
                <FallingElement
                    key={el.id}
                    id={el.id}
                    type={el.type}
                    x={el.x}
                    duration={el.duration}
                    onAnimationEnd={removeFallingElement}
                />
            ))}

            {/* === Global Animation Styles === */}
            <style jsx global>{`
                @keyframes fall {
                    0% {
                        transform: translateY(0) translateX(0);
                    }
                    25% {
                        transform: translateY(25vh) translateX(5vw);
                    }
                    50% {
                        transform: translateY(50vh) translateX(-5vw);
                    }
                    75% {
                        transform: translateY(75vh) translateX(5vw);
                    }
                    100% {
                        transform: translateY(100vh) translateX(0);
                    }
                }
            `}</style>
        </div>
    );
}