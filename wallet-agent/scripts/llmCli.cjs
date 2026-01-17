require("dotenv/config");
const Groq = require("groq-sdk");
const readline = require("readline");
const { getBalanceText } = require("./balanceFn.cjs");

const groq = new Groq({ apiKey: process.env.AI_API_KEY });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function answerWithLLM(prompt, contextText) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content:
          "Kamu adalah AI Agent untuk wallet Sui. Jawab singkat, jelas, bahasa Indonesia. Jika data kosong, jelaskan kemungkinan network mismatch/testnet.",
      },
      {
        role: "user",
        content: `Pertanyaan user: "${prompt}"\n\nData dari wallet:\n${contextText}`,
      },
    ],
  });

  return completion.choices?.[0]?.message?.content || "(Tidak ada jawaban)";
}

function detectIntent(prompt) {
  const p = prompt.toLowerCase();
  if (/(saldo|balance|aset|holdings)/i.test(p)) return "BALANCE";
  if (/(exit|quit|keluar)/i.test(p)) return "EXIT";
  return "UNKNOWN";
}

async function main() {
  console.log("✅ Sui Wallet AI Agent (Nimbus + Groq)");
  console.log("Ketik pertanyaan (contoh: 'berapa saldo saya?'). ketik 'exit' untuk keluar.\n");

  while (true) {
    const prompt = await new Promise((resolve) => rl.question("> ", resolve));
    const intent = detectIntent(prompt);

    if (intent === "EXIT") break;

    if (intent === "BALANCE") {
      const balanceText = await getBalanceText();
      const ai = await answerWithLLM(prompt, balanceText);
      console.log("\n🤖 AI:\n" + ai + "\n");
      continue;
    }

    console.log("Aku baru bisa handle intent saldo/balance. Contoh: 'saldo saya berapa?'\n");
  }

  rl.close();
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
