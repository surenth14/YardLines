export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message } = req.body;
        const openrouterKey = process.env.OPENROUTER_API_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;

        const systemPrompt = `You are the Yardlines AI Advisor. Yardlines provides globally managed solutions in Technology & AI (software dev, QA, DevOps), Finance & Accounting (bookkeeping, AP/AR, reconciliations), and Business Operations (data entry, support, admin). Yardlines operates from India delivering 65%-75% cost savings with timezone alignment for US, UK, and Australian clients. Be professional, concise, friendly, and guide users to request a quote or book a strategy call.`;

        // 1. OpenRouter API integration
        if (openrouterKey) {
            const openrouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${openrouterKey}`,
                    "HTTP-Referer": "https://yardlines.vercel.app",
                    "X-Title": "Yardlines AI Advisor",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: process.env.OPENROUTER_MODEL || "openrouter/auto",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: message }
                    ]
                })
            });

            if (openrouterRes.ok) {
                const data = await openrouterRes.json();
                const reply = data.choices?.[0]?.message?.content;
                if (reply) return res.status(200).json({ reply });
            }
        }

        // 2. Gemini API integration fallback
        if (geminiKey) {
            const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        { role: 'user', parts: [{ text: systemPrompt }] },
                        { role: 'user', parts: [{ text: message }] }
                    ]
                })
            });

            if (geminiRes.ok) {
                const data = await geminiRes.json();
                const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (reply) return res.status(200).json({ reply });
            }
        }

        // 3. Fallback response if no API key is provided
        return res.status(200).json({ reply: null, fallback: true });

    } catch (err) {
        return res.status(500).json({ error: 'Failed to generate AI response' });
    }
}
