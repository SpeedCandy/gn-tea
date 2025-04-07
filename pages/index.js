import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

const rpcList = [
    "https://tea-sepolia.g.alchemy.com/v2/x9kAVF2fxH9CG2gxfMn5zCbhC_-SoAsD",
    "https://tea-sepolia.g.alchemy.com/v2/hMVs30GZQ5d_sFWTYGx8ZViugptqpksK"
];

const contractAddress = "0xEdF7dE119Fe7c0d2c0252a2e47E0c7FBc3FE1D4a";
const abi = [
    "function gn() external",
    "function turboGN() external",
    "event GNed(address indexed user, uint256 timestamp)"
];

async function getWorkingProvider() {
    for (const rpc of rpcList) {
        try {
            const provider = new ethers.JsonRpcProvider(rpc);
            await provider.getBlockNumber();
            return provider;
        } catch (err) {
            console.error(`RPC Failed: ${rpc}`);
        }
    }
    throw new Error("All RPCs failed");
}

export default function Home() {
    const [statusMessages, setStatusMessages] = useState([]);
    const [dailyCount, setDailyCount] = useState(0);
    const [totalUser, setTotalUser] = useState(0);
    const [totalTx, setTotalTx] = useState(0);
    const [hoverColor, setHoverColor] = useState('pink');

    useEffect(() => {
        async function fetchEvents() {
            try {
                const provider = await getWorkingProvider();
                const contract = new ethers.Contract(contractAddress, abi, provider);

                const latestBlock = await provider.getBlockNumber();
                const fromBlock = Math.max(latestBlock - 50000, 0);

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
            } catch (error) {
                console.error("Error fetching events:", error);
            }
        }

        fetchEvents();
        const interval = setInterval(fetchEvents, 10000);
        return () => clearInterval(interval);
    }, []);

    async function sendGN() {
        try {
            if (!window.ethereum) throw new Error('Wallet not found');
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(contractAddress, abi, signer);

            const tx = await contract.gn();
            setStatusMessages(prev => [...prev, `GN TX Sent: ${tx.hash}`]);

            await tx.wait();
            setStatusMessages(prev => [...prev, `GN TX Confirmed: ${tx.hash}`]);
        } catch (error) {
            setStatusMessages(prev => [...prev, `Error: ${error.message}`]);
        }
    }

    async function sendTurboGN() {
        try {
            if (!window.ethereum) throw new Error('Wallet not found');
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(contractAddress, abi, signer);

            const tx = await contract.turboGN();
            setStatusMessages(prev => [...prev, `Turbo GN TX Sent: ${tx.hash}`]);

            await tx.wait();
            setStatusMessages(prev => [...prev, `Turbo GN TX Confirmed: ${tx.hash}`]);
        } catch (error) {
            setStatusMessages(prev => [...prev, `Error: ${error.message}`]);
        }
    }

    return (
        <div className="container">
            <h1>GN Tea Sepolia</h1>
            <div className="buttons">
                <button
                    onClick={sendGN}
                    onMouseEnter={() => setHoverColor('blue')}
                    style={{ backgroundColor: hoverColor }}
                    className="text-white font-bold py-2 px-6 rounded-full transition-all duration-200 transform hover:scale-105"
                >
                    GN
                </button>
                <button
                    onClick={sendTurboGN}
                    onMouseEnter={() => setHoverColor('green')}
                    style={{ backgroundColor: hoverColor }}
                    className="text-white font-bold py-2 px-6 rounded-full transition-all duration-200 transform hover:scale-105"
                >
                    Turbo GN
                </button>
            </div>
            <div className="stats">
                <p>Total Transactions: {totalTx}</p>
                <p>Daily Users: {dailyCount}</p>
                <p>Total Users: {totalUser}</p>
            </div>
            <div className="status-messages">
                <h2>Status Messages</h2>
                <ul>
                    {statusMessages.map((msg, index) => (
                        <li key={index}>{msg}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}