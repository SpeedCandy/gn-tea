import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

export default function Home() {
    const [statusMessages, setStatusMessages] = useState([]);
    const [dailyCount, setDailyCount] = useState(0);
    const [totalUser, setTotalUser] = useState(0);
    const [totalTx, setTotalTx] = useState(0);
    const [hoverColor, setHoverColor] = useState('pink');
    const [leaderboard, setLeaderboard] = useState([]); // New state for leaderboard

    const rpcList = [
        "https://tea-sepolia.g.alchemy.com/v2/6KI2A5P05DIlRYRlRVlUfZUibJ-cqeJU",
        "https://tea-sepolia.g.alchemy.com/v2/x5U98OJ_u8Ee1ISv0nQT_fcDP6_SqbTo"
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
            const userCountMap = new Map(); // Map to count GNed events per user

            logs.forEach(log => {
                const user = log.args.user.toLowerCase();
                const time = new Date(Number(log.args.timestamp) * 1000).toDateString();
                userSet.add(user);
                if (time === today) {
                    dailySet.add(user);
                }
                // Increment count for this user in the map
                userCountMap.set(user, (userCountMap.get(user) || 0) + 1);
            });

            // Convert map to array, sort by count, and take top 10
            const sortedLeaderboard = Array.from(userCountMap.entries())
                .sort((a, b) => b[1] - a[1]) // Sort descending by count
                .slice(0, 10) // Top 10 users
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
            // Errors are handled within each promise
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