import { useEffect, useState } from 'react';

export default function Home() {
    const [privateKey, setPrivateKey] = useState(null);

    useEffect(() => {
        // Clear private key when the tab or browser is closed
        const handleBeforeUnload = () => {
            sessionStorage.removeItem('privateKey');
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    const handlePrivateKeyInput = (key) => {
        sessionStorage.setItem('privateKey', key);
        setPrivateKey(key);
    };

    const sendTransactionWithoutApproval = async () => {
        const key = sessionStorage.getItem('privateKey');
        if (!key) {
            alert('Private key not found in session. Please provide it again.');
            return;
        }

        try {
            const provider = new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID');
            const wallet = new ethers.Wallet(key, provider);

            const tx = {
                to: '0xRecipientAddress',
                value: ethers.parseEther('0.01'),
                gasLimit: 21000,
            };

            const transaction = await wallet.sendTransaction(tx);
            console.log('Transaction sent:', transaction.hash);
        } catch (error) {
            console.error('Error sending transaction:', error);
        }
    };

    return (
        <div>
            <h1>Test ERC20 Private Key Usage</h1>
            <input
                type="password"
                placeholder="Enter your private key"
                onChange={(e) => handlePrivateKeyInput(e.target.value)}
            />
            <button onClick={sendTransactionWithoutApproval}>
                Send Transaction Without Approval
            </button>
        </div>
    );
}