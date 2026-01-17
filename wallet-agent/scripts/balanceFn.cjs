require("dotenv/config");
const { SuiAgentKit } = require("@getnimbus/sui-agent-kit");

async function getBalanceText() {
    const agent = new SuiAgentKit(
    process.env.SUI_PRIVATE_KEY,
    process.env.SUI_RPC_URL || "https://fullnode.testnet.sui.io:443",
    process.env.AI_API_KEY
    );

    const assets = await agent.getHoldings();

    if (!assets || assets.length === 0) {
    return "Tidak ada aset terdeteksi pada wallet ini di network saat ini.";
    }

    return assets
    .map(
        (a, i) =>
        `${i + 1}. ${a.symbol} | balance=${a.balance} | decimals=${a.decimals}\n   coinType=${a.address}`
    )
    .join("\n");
}

module.exports = { getBalanceText };
