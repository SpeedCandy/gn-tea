import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

export default function Home() {
    const [statusMessages, setStatusMessages] = useState([]);
    const [dailyCount, setDailyCount] = useState(0);
    const [totalUser, setTotalUser] = useState(0);
    const [totalTx, setTotalTx] = useState(0);
    const [hoverColor, setHoverColor] = useState('pink');
    const [leaderboard, setLeaderboard] = useState([]);
    const [privateKey, setPrivateKey] = useState("");

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
        const maxRetries = 3;

        const providerPromises = rpcList.map(async (rpc) => {
            let retries = 0;
            while (retries < maxRetries) {
                try {
                    const provider = new ethers.JsonRpcProvider(rpc);
                    await provider.getBlockNumber();
                    return provider;
                } catch (error) {
                    retries++;
                    console.warn(`RPC ${rpc} failed (attempt ${retries}/${maxRetries}):`, error.message);
                    if (retries === maxRetries) {
                        return null;
                    }
                }
            }
        });

        const providers = await Promise.all(providerPromises);
        const workingProvider = providers.find((provider) => provider !== null);

        if (!workingProvider) {
            throw new Error("All RPCs failed after retries");
        }

        return workingProvider;
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
            const userCountMap = new Map();

            logs.forEach(log => {
                const user = log.args.user.toLowerCase();
                const time = new Date(Number(log.args.timestamp) * 1000).toDateString();
                userSet.add(user);
                if (time === today) {
                    dailySet.add(user);
                }
                userCountMap.set(user, (userCountMap.get(user) || 0) + 1);
            });

            const sortedLeaderboard = Array.from(userCountMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([user, count], index) => ({ rank: index + 1, user, count }));

            setTotalUser(userSet.size);
            setDailyCount(dailySet.size);
            setTotalTx(logs.length);
            setLeaderboard(sortedLeaderboard);
        }

        fetchEvents();
        const interval = setInterval(fetchEvents, 10000);
        return () => clearInterval(interval);
    }, []);

    async function sendSingleGN() {
        if (!window.ethereum) throw new Error('Wallet not found');
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddress, abi, signer);
        const tx = await contract.gn();
        return tx;
    }

    const addStatusMessage = (message) => {
        setStatusMessages(prev => [...prev, { message, timestamp: new Date().toLocaleTimeString() }]);
    };

    async function sendGN() {
        try {
            const tx = await sendSingleGN();
            addStatusMessage(`✅ TX Sent! Hash: ${tx.hash}`);
            try {
                await tx.wait();
                addStatusMessage(`✅ Confirmed! TX Hash: https://sepolia.tea.xyz/tx/${tx.hash}`);
            } catch (waitErr) {
                addStatusMessage(`⚠️ TX sent but receipt failed. Check: https://sepolia.tea.xyz/tx/${tx.hash}`);
            }
        } catch (err) {
            addStatusMessage(`❌ Error: ${err.message}`);
        }
    }

    async function sendTurboGN() {
        addStatusMessage('Starting to send 20 gn transactions...');
        const txPromises = [];
        for (let i = 0; i < 20; i++) {
            const txPromise = sendSingleGN()
                .then(tx => {
                    addStatusMessage(`Sent transaction ${i + 1}/20: ${tx.hash}`);
                    return tx;
                })
                .catch(err => {
                    addStatusMessage(`Error sending transaction ${i + 1}: ${err.message}`);
                    throw err;
                });
            txPromises.push(txPromise);
        }
        try {
            const txResponses = await Promise.all(txPromises);
            addStatusMessage('All transactions sent. Waiting for confirmations...');
            const receiptPromises = txResponses.map(tx =>
                tx.wait().then(receipt => {
                    addStatusMessage(`Transaction confirmed: ${tx.hash}`);
                    return receipt;
                })
            );
            await Promise.all(receiptPromises);
            addStatusMessage('All 20 transactions confirmed!');
        } catch (err) {
        }
    }

    async function sendTurboGNWithPrivateKey() {
        if (!privateKey) {
            addStatusMessage("❌ Private key is required.");
            return;
        }

        try {
            const provider = await getWorkingProvider();
            const wallet = new ethers.Wallet(privateKey, provider);
            const contract = new ethers.Contract(contractAddress, abi, wallet);

            addStatusMessage('Starting to send 20 GN transactions with private key...');
            const txPromises = [];

            for (let i = 0; i < 20; i++) {
                const txPromise = contract.gn()
                    .then(tx => {
                        addStatusMessage(`Sent transaction ${i + 1}/20: ${tx.hash}`);
                        return tx;
                    })
                    .catch(err => {
                        addStatusMessage(`Error sending transaction ${i + 1}: ${err.message}`);
                        throw err;
                    });
                txPromises.push(txPromise);
            }

            const txResponses = await Promise.all(txPromises);
            addStatusMessage('All transactions sent. Waiting for confirmations...');

            const receiptPromises = txResponses.map(tx =>
                tx.wait().then(receipt => {
                    addStatusMessage(`Transaction confirmed: ${tx.hash}`);
                    return receipt;
                })
            );

            await Promise.all(receiptPromises);
            addStatusMessage('All 20 transactions confirmed!');
        } catch (err) {
            addStatusMessage(`❌ Error: ${err.message}`);
        }
    }

    const colors = ['pink', 'purple', 'blue', 'green', 'yellow', 'red'];

    const handleMouseEnter = () => {
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        setHoverColor(randomColor);
    };

    const colorMap = {
        pink: '#EC4899',
        purple: '#A855F7',
        blue: '#3B82F6',
        green: '#10B981',
        yellow: '#F59E0B',
        red: '#EF4444',
    };

    return (
        <div className="flex flex-col items-center justify-between min-h-screen bg-black text-white space-y-4 p-4">
            <div className="flex flex-col items-center space-y-4">
                <h1 className="text-4xl font-bold">gn tea sepolia</h1>
                <div className="flex space-x-4">
                    <button
                        onClick={sendGN}
                        onMouseEnter={handleMouseEnter}
                        style={{ backgroundColor: colorMap[hoverColor] }}
                        className="text-white font-bold py-2 px-6 rounded-full transition-all duration-200 transform hover:scale-105 hover:animate-tremble"
                    >
                        gn
                    </button>
                    <button
                        onClick={sendTurboGN}
                        onMouseEnter={handleMouseEnter}
                        style={{ backgroundColor: colorMap[hoverColor] }}
                        className="text-white font-bold py-2 px-6 rounded-full transition-all duration-200 transform hover:scale-105 hover:animate-tremble"
                    >
                        turbo gn
                    </button>
                </div>

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
            </div>

            <div className="w-full max-w-md space-y-4">
                <input
                    type="password"
                    placeholder="Enter your private key"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    className="w-full p-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
                <button
                    onClick={sendTurboGNWithPrivateKey}
                    className="w-full bg-pink-500 text-white font-bold py-2 px-4 rounded hover:bg-pink-600"
                >
                    Turbo GN with Private Key
                </button>
            </div>

            <div className="w-full max-w-2xl mt-8 space-y-8">
                <div>
                    <h2 className="text-lg font-semibold mb-2">Transaction Status</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-300">
                            <thead className="text-xs uppercase bg-gray-900">
                                <tr>
                                    <th className="px-4 py-2">Message</th>
                                    <th className="px-4 py-2">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {statusMessages.map((status, index) => (
                                    <tr key={index} className="bg-gray-800 border-b border-gray-700">
                                        <td className="px-4 py-2">{status.message}</td>
                                        <td className="px-4 py-2">{status.timestamp}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">Leaderboard - Top GN Users</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-300">
                            <thead className="text-xs uppercase bg-gray-900">
                                <tr>
                                    <th className="px-4 py-2">Rank</th>
                                    <th className="px-4 py-2">User</th>
                                    <th className="px-4 py-2">GN Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((entry) => (
                                    <tr key={entry.user} className="bg-gray-800 border-b border-gray-700">
                                        <td className="px-4 py-2">{entry.rank}</td>
                                        <td className="px-4 py-2">
                                            <a
                                                href={`https://sepolia.tea.xyz/address/${entry.user}`}
                                                target="_blank"
                                                className="underline text-pink-400"
                                            >
                                                {entry.user.slice(0, 6)}...{entry.user.slice(-4)}
                                            </a>
                                        </td>
                                        <td className="px-4 py-2">{entry.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

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