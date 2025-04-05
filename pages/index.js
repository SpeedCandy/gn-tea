import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

export default function Home() {
    const [status, setStatus] = useState('');
    const [dailyCount, setDailyCount] = useState(0);
    const [totalUser, setTotalUser] = useState(0);
    const [totalTx, setTotalTx] = useState(0);
    const [hoverColor, setHoverColor] = useState('pink');

    const rpcList = [
        "https://tea-sepolia.g.alchemy.com/v2/x9kAVF2fxH9CG2gxfMn5zCbhC_-SoAsD",
        "https://tea-sepolia.g.alchemy.com/v2/hMVs30GZQ5d_sFWTYGx8ZViugptqpksK"
    ];

    const contractAddress = "0xEdF7dE119Fe7c0d2c0252a2e47E0c7FBc3FE1D4a";

    const abi = [
        "function gn() external",
        "event GNed(address indexed user, uint256 timestamp)"
    ];

    async function getWorkingProvider() {
        for (const rpc of rpcList) {
            try {
                const provider = new ethers.JsonRpcProvider(rpc);
                await provider.getBlockNumber();
                console.log(`✅ Connected to: ${rpc}`);
                return provider;
            } catch (err) {
                console.log(`❌ RPC Failed: ${rpc}`);
            }
        }
        throw new Error("❌ All RPC failed");
    }

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

    async function sendGN() {
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

    const colors = ['pink', 'purple', 'blue', 'green', 'yellow', 'red'];

    const handleMouseEnter = () => {
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        setHoverColor(randomColor);
    };

    // Tailwind'in renklerine uygun hex kodları
    const colorMap = {
        pink: '#EC4899',
        purple: '#A855F7',
        blue: '#3B82F6',
        green: '#10B981',
        yellow: '#F59E0B',
        red: '#EF4444',
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white space-y-4 p-4">
            <h1 className="text-4xl font-bold">gn tea sepolia</h1>
            <button
                onClick={sendGN}
                onMouseEnter={handleMouseEnter}
                style={{ backgroundColor: colorMap[hoverColor] }}
                className="text-white font-bold py-2 px-6 rounded-full transition-all duration-200 transform hover:scale-105 hover:animate-tremble"
            >
                gn
            </button>

            <div className="text-sm mt-4 space-y-1 text-center">
                <p>💎 Total TX (onchain): {totalTx}</p>
                <p>✅ Total Unique Users Today: {dailyCount}</p>
                <p>✅ Total Unique Users All Time: {totalUser}</p>
                <p>Contract: <a href={`https://sepolia.tea.xyz/address/${contractAddress}`} target="_blank" className="underline text-pink-400">{contractAddress}</a></p>
                <p>Chain ID: 10218 (Tea Sepolia)</p>
            </div>

            <div className="text-xs mt-8 opacity-70 text-center transition-all hover:opacity-100 hover:scale-105">
                Built by <a href="https://github.com/H15S" target="_blank" className="underline hover:text-pink-400">H15S</a>
            </div>

            <div className="text-xs mt-8 opacity-70 text-center transition-all hover:opacity-100 hover:scale-105">
                <a href="https://github.com/SpeedCandy" target="_blank" className="underline hover:text-red-400">Thank you for making it open source!</a>
            </div>

            <p>{status}</p>

            <style jsx>{`
                @keyframes tremble {
                    0% { transform: translate(0, 0) rotate(0deg); }
                    20% { transform: translate(-2px, 2px) rotate(-2deg); }
                    40% { transform: translate(2px, -2px) rotate(2deg); }
                    60% { transform: translate(-2px, 0) rotate(-1deg); }
                    80% { transform: translate(2px, 0) rotate(1deg); }
                    100% { transform: translate(0, 0) rotate(0deg); }
                }
                .animate-tremble {
                    animation: tremble 0.3s infinite;
                }
            `}</style>
        </div>
    );
}